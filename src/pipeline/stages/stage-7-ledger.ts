import {
  createEvidenceRecord,
  createVerdictRecord,
} from "../../repositories/claim-repository.js";
import { setCacheValue } from "../../cache/redis-client.js";
import type {
  ClaimRecord,
  EvidenceRecord,
  VerdictRecord,
} from "../../schemas/database.schema.js";
import type { Stage6ScoringResult } from "./stage-6-scoring.js";
import type { SourceType } from "../../domain/scoring/scoring-calculator.js";
import { systemLogger } from "../../utils/logger.js";

export interface Stage7LedgerEntryInput {
  claimRecord: ClaimRecord;
  deduplicationKey: string;
  scoringResult: Stage6ScoringResult;
  sourceType: SourceType | null;
  sourceUrl: string | null;
  sourceDomain: string | null;
  matchedText: string | null;
  rawResponseCachePath: string | null;
}

export interface VerifiedClaimLedgerEntry {
  claimId: string;
  timestampSeconds: number;
  rawText: string;
  category: "health" | "financial" | "general";
  trustScore: number;
  confidenceLabel: "high_confidence" | "contested" | "unverified";
  verifiedClaimText: string | null;
  evidence: Array<{
    sourceType: SourceType;
    sourceUrl: string | null;
    sourceDomain: string | null;
    sourceAuthorityScore: number;
    matchedText: string | null;
    groundingSimilarity: number;
    rawResponseCachePath: string;
  }>;
  conflictingClaims: string[];
}

export const executeStage7LedgerPersistence = async (
  ledgerInput: Stage7LedgerEntryInput,
): Promise<VerifiedClaimLedgerEntry> => {
  const {
    claimRecord,
    deduplicationKey,
    scoringResult,
    sourceType,
    sourceUrl,
    sourceDomain,
    matchedText,
    rawResponseCachePath,
  } = ledgerInput;

  systemLogger.info(`Stage 7: Writing through persistence for claim '${claimRecord.id}'.`);

  const createdEvidenceList: EvidenceRecord[] = [];

  // 1. Write Evidence record to database if external evidence was gathered
  if (sourceType !== null && rawResponseCachePath !== null) {
    const evidenceRow = await createEvidenceRecord({
      claimId: claimRecord.id,
      sourceType,
      sourceUrl,
      sourceDomain,
      sourceAuthorityScore: scoringResult.sourceAuthorityScore,
      matchedText,
      groundingSimilarity: scoringResult.groundingSimilarity,
      rawResponseCachePath,
    });
    createdEvidenceList.push(evidenceRow);
  }

  // 2. Write Verdict record to database
  const verdictRow: VerdictRecord = await createVerdictRecord({
    claimId: claimRecord.id,
    trustScore: scoringResult.trustScore,
    confidenceLabel: scoringResult.confidenceLabel,
    verifiedClaimText: scoringResult.verifiedClaimText,
    conflictingClaims: scoringResult.conflictingClaims,
  });

  // 3. Write-through to Redis hot cache keyed by claim deduplication hash
  const cachedPayload = {
    claim: claimRecord,
    verdict: verdictRow,
    evidence: createdEvidenceList,
  };

  await setCacheValue(deduplicationKey, JSON.stringify(cachedPayload), 86400);

  return {
    claimId: claimRecord.id,
    timestampSeconds: claimRecord.timestampSeconds,
    rawText: claimRecord.rawText,
    category: claimRecord.category,
    trustScore: verdictRow.trustScore,
    confidenceLabel: verdictRow.confidenceLabel,
    verifiedClaimText: verdictRow.verifiedClaimText,
    evidence: createdEvidenceList.map((evidenceItem) => ({
      sourceType: evidenceItem.sourceType as SourceType,
      sourceUrl: evidenceItem.sourceUrl,
      sourceDomain: evidenceItem.sourceDomain,
      sourceAuthorityScore: evidenceItem.sourceAuthorityScore,
      matchedText: evidenceItem.matchedText,
      groundingSimilarity: evidenceItem.groundingSimilarity,
      rawResponseCachePath: evidenceItem.rawResponseCachePath,
    })),
    conflictingClaims: (verdictRow.conflictingClaims as string[]) ?? [],
  };
};
