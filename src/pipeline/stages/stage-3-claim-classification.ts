import type { ExtractedClaim } from "../../clients/llm/llm-client.js";
import {
  normalizeClaimText,
  hashNormalizedClaim,
  generateClaimDeduplicationKey,
} from "../../cache/claim-hasher.js";

export interface ClassifiedClaimWithHash extends ExtractedClaim {
  normalizedText: string;
  claimHash: string;
  deduplicationKey: string;
}

export const executeStage3ClaimClassification = (
  extractedClaims: ExtractedClaim[],
): ClassifiedClaimWithHash[] => {
  return extractedClaims.map((claimItem) => {
    const normalizedText = normalizeClaimText(claimItem.rawText);
    const claimHash = hashNormalizedClaim(normalizedText);
    const deduplicationKey = generateClaimDeduplicationKey(claimItem.rawText);

    return {
      ...claimItem,
      normalizedText,
      claimHash,
      deduplicationKey,
    };
  });
};
