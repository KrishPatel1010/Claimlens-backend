import { createHash } from "node:crypto";

export const normalizeClaimText = (rawClaimText: string): string => {
  return rawClaimText
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
};

export const hashNormalizedClaim = (normalizedClaimText: string): string => {
  return createHash("sha256").update(normalizedClaimText).digest("hex");
};

export const generateClaimDeduplicationKey = (rawClaimText: string): string => {
  const normalizedText = normalizeClaimText(rawClaimText);
  const claimHash = hashNormalizedClaim(normalizedText);
  return `claim:${claimHash}`;
};
