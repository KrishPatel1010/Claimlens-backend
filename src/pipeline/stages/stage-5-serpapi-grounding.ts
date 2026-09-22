import {
  fetchScholarGrounding,
  fetchFinanceGrounding,
  fetchWebSearchGrounding,
  type GroundingEvidenceMatch,
} from "../../clients/serpapi/serpapi-grounding-client.js";
import { writeRawResponseToDisk } from "../../cache/disk-cache-manager.js";
import { systemLogger } from "../../utils/logger.js";
import type { SourceType } from "../../domain/scoring/scoring-calculator.js";

export interface Stage5GroundingResult {
  hasGrounding: boolean;
  sourceType: SourceType | null;
  sourceUrl: string | null;
  sourceDomain: string | null;
  matchedText: string | null;
  rawResponseCachePath: string | null;
}

export const executeStage5SerpApiGrounding = async (
  claimId: string,
  claimText: string,
  category: "health" | "financial" | "general",
): Promise<Stage5GroundingResult> => {
  systemLogger.info(
    `Stage 5: Invoking SerpApi Grounding fallback for claim '${claimId}' (category: ${category}).`,
  );

  let groundingMatch: GroundingEvidenceMatch | null = null;

  if (category === "health") {
    groundingMatch = await fetchScholarGrounding(claimText);
  } else if (category === "financial") {
    groundingMatch = await fetchFinanceGrounding(claimText);
  } else {
    groundingMatch = await fetchWebSearchGrounding(claimText);
  }

  if (groundingMatch !== null && groundingMatch.matchedText !== null) {
    const rawCacheFileName = `${claimId}_${groundingMatch.sourceType}`;
    const writtenDiskPath = await writeRawResponseToDisk(
      rawCacheFileName,
      groundingMatch.rawResponse,
    );

    return {
      hasGrounding: true,
      sourceType: groundingMatch.sourceType,
      sourceUrl: groundingMatch.sourceUrl,
      sourceDomain: groundingMatch.sourceDomain,
      matchedText: groundingMatch.matchedText,
      rawResponseCachePath: writtenDiskPath,
    };
  }

  return {
    hasGrounding: false,
    sourceType: null,
    sourceUrl: null,
    sourceDomain: null,
    matchedText: null,
    rawResponseCachePath: null,
  };
};
