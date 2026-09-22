import { executeStage1TranscriptFetching } from "./stages/stage-1-transcript.js";
import { executeStage2ClaimExtraction } from "./stages/stage-2-claim-extraction.js";
import { executeStage3ClaimClassification } from "./stages/stage-3-claim-classification.js";
import { executeStage4FactCheckLookup } from "./stages/stage-4-fact-check.js";
import { executeStage5SerpApiGrounding } from "./stages/stage-5-serpapi-grounding.js";
import { executeStage6Scoring } from "./stages/stage-6-scoring.js";
import {
  executeStage7LedgerPersistence,
  type VerifiedClaimLedgerEntry,
} from "./stages/stage-7-ledger.js";
import {
  createClaimRecord,
} from "../repositories/claim-repository.js";
import { markVideoAsProcessed } from "../repositories/video-repository.js";
import { getCacheValue } from "../cache/redis-client.js";
import { extractYouTubeVideoId } from "../utils/youtube-url-parser.js";
import { systemLogger } from "../utils/logger.js";
import type { VideoRecord } from "../schemas/database.schema.js";
import type { SourceType } from "../domain/scoring/scoring-calculator.js";

export interface PipelineExecutionInput {
  youtubeUrl: string;
  videoTitle?: string | null;
}

export interface PipelineExecutionResult {
  video: VideoRecord;
  claimsCount: number;
  verifiedLedger: VerifiedClaimLedgerEntry[];
  cacheSummary: {
    videoCacheStatus: string;
    cachedClaimsCount: number;
    liveGroundingCount: number;
  };
}

export const executeVerificationPipeline = async (
  pipelineInput: PipelineExecutionInput,
): Promise<PipelineExecutionResult> => {
  const { youtubeUrl, videoTitle } = pipelineInput;
  const youtubeVideoId = extractYouTubeVideoId(youtubeUrl);

  systemLogger.info(`Starting 7-Stage Verification Pipeline for YouTube ID '${youtubeVideoId}'.`);

  // Stage 1: Transcript Fetching & Cache Check
  const stage1Result = await executeStage1TranscriptFetching({
    youtubeVideoId,
    youtubeUrl,
    videoTitle,
  });

  // Stage 2: Claim Extraction (LLM / Heuristic)
  const extractedClaims = await executeStage2ClaimExtraction(
    stage1Result.transcriptSegments,
  );

  // Stage 3: Claim Classification & SHA-256 Deduplication Hashing
  const classifiedClaims = executeStage3ClaimClassification(extractedClaims);

  const verifiedLedger: VerifiedClaimLedgerEntry[] = [];
  let cachedClaimsCount = 0;
  let liveGroundingCount = 0;

  for (const classifiedClaim of classifiedClaims) {
    // Check Tier 1: Redis Hot Cache by normalized claim hash
    const cachedClaimJson = await getCacheValue(classifiedClaim.deduplicationKey);

    if (cachedClaimJson !== null) {
      try {
        const parsedCachedClaim = JSON.parse(cachedClaimJson) as {
          claim: { id: string };
          verdict: {
            trustScore: number;
            confidenceLabel: "high_confidence" | "contested" | "unverified";
            verifiedClaimText: string | null;
            conflictingClaims: string[];
          };
          evidence: Array<{
            sourceType: SourceType;
            sourceUrl: string | null;
            sourceDomain: string | null;
            sourceAuthorityScore: number;
            matchedText: string | null;
            groundingSimilarity: number;
            rawResponseCachePath: string;
          }>;
        };

        verifiedLedger.push({
          claimId: parsedCachedClaim.claim.id,
          timestampSeconds: classifiedClaim.timestampSeconds,
          rawText: classifiedClaim.rawText,
          category: classifiedClaim.category,
          trustScore: parsedCachedClaim.verdict.trustScore,
          confidenceLabel: parsedCachedClaim.verdict.confidenceLabel,
          verifiedClaimText: parsedCachedClaim.verdict.verifiedClaimText,
          evidence: parsedCachedClaim.evidence ?? [],
          conflictingClaims: parsedCachedClaim.verdict.conflictingClaims ?? [],
        });

        cachedClaimsCount += 1;
        systemLogger.info(`Claim cache hit (0 credit consumed) for '${classifiedClaim.rawText}'.`);
        continue;
      } catch {
        // Parse error, proceed with standard pipeline
      }
    }

    // Persist claim record
    const persistedClaim = await createClaimRecord({
      videoId: stage1Result.videoRecord.id,
      timestampSeconds: classifiedClaim.timestampSeconds,
      rawText: classifiedClaim.rawText,
      category: classifiedClaim.category,
      status: "resolved",
    });

    // Stage 4: Fact Check Lookup (Free API first)
    const stage4Result = await executeStage4FactCheckLookup(
      persistedClaim.id,
      classifiedClaim.rawText,
    );

    let resolvedSourceType: SourceType | null = stage4Result.sourceType;
    let resolvedSourceUrl: string | null = stage4Result.sourceUrl;
    let resolvedSourceDomain: string | null = stage4Result.sourceDomain;
    let resolvedMatchedText: string | null = stage4Result.matchedText;
    let resolvedRawResponseCachePath: string | null = stage4Result.rawResponseCachePath;

    // Stage 5: SerpApi Grounding Fallback (only on Fact Check miss)
    if (!stage4Result.hasMatch) {
      liveGroundingCount += 1;
      const stage5Result = await executeStage5SerpApiGrounding(
        persistedClaim.id,
        classifiedClaim.rawText,
        classifiedClaim.category,
      );

      if (stage5Result.hasGrounding) {
        resolvedSourceType = stage5Result.sourceType;
        resolvedSourceUrl = stage5Result.sourceUrl;
        resolvedSourceDomain = stage5Result.sourceDomain;
        resolvedMatchedText = stage5Result.matchedText;
        resolvedRawResponseCachePath = stage5Result.rawResponseCachePath;
      }
    }

    // Stage 6: Scoring Algorithm
    const stage6Result = await executeStage6Scoring({
      claimId: persistedClaim.id,
      claimText: classifiedClaim.rawText,
      sourceType: resolvedSourceType,
      sourceDomain: resolvedSourceDomain,
      matchedText: resolvedMatchedText,
    });

    // Stage 7: Ledger Assembly & Write-Through
    const ledgerEntry = await executeStage7LedgerPersistence({
      claimRecord: persistedClaim,
      deduplicationKey: classifiedClaim.deduplicationKey,
      scoringResult: stage6Result,
      sourceType: resolvedSourceType,
      sourceUrl: resolvedSourceUrl,
      sourceDomain: resolvedSourceDomain,
      matchedText: resolvedMatchedText,
      rawResponseCachePath: resolvedRawResponseCachePath,
    });

    verifiedLedger.push(ledgerEntry);
  }

  // Mark video as processed
  const updatedVideoRecord =
    (await markVideoAsProcessed(youtubeVideoId)) ?? stage1Result.videoRecord;

  return {
    video: updatedVideoRecord,
    claimsCount: verifiedLedger.length,
    verifiedLedger,
    cacheSummary: {
      videoCacheStatus: stage1Result.cacheStatus,
      cachedClaimsCount,
      liveGroundingCount,
    },
  };
};
