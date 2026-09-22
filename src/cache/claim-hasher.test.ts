import { describe, it, expect } from "vitest";
import {
  normalizeClaimText,
  hashNormalizedClaim,
  generateClaimDeduplicationKey,
} from "./claim-hasher.js";

describe("Claim Hasher & Normalizer", () => {
  it("should normalize claim text by lowercasing, stripping punctuation, and trimming spaces", () => {
    const rawClaimSample = "  Turmeric, Cures Diabetes within 30 days!  ";
    const normalizedClaim = normalizeClaimText(rawClaimSample);

    expect(normalizedClaim).toBe("turmeric cures diabetes within 30 days");
  });

  it("should generate identical hashes for equivalent claims with different punctuation or casing", () => {
    const claimVariantA = "Drinking green tea burns 500 calories per day.";
    const claimVariantB = "  DRINKING green tea burns 500 calories per day!  ";

    const hashVariantA = hashNormalizedClaim(normalizeClaimText(claimVariantA));
    const hashVariantB = hashNormalizedClaim(normalizeClaimText(claimVariantB));

    expect(hashVariantA).toBe(hashVariantB);
    expect(hashVariantA).toHaveLength(64);
  });

  it("should generate proper Redis deduplication keys prefixed with 'claim:'", () => {
    const claimSample = "Apple stock will reach 300 by December.";
    const deduplicationKey = generateClaimDeduplicationKey(claimSample);

    expect(deduplicationKey.startsWith("claim:")).toBe(true);
    expect(deduplicationKey).toHaveLength(70); // "claim:" (6 chars) + 64 hex chars
  });
});
