import { describe, it, expect, beforeEach } from "vitest";
import {
  createClaimRecord,
  findClaimsByVideoId,
  createEvidenceRecord,
  findEvidenceByClaimId,
  createVerdictRecord,
  findVerdictByClaimId,
  findFullClaimLedgerByVideoId,
  clearInMemoryClaimStores,
} from "./claim-repository.js";

describe("Claim Repository", () => {
  beforeEach(() => {
    clearInMemoryClaimStores();
  });

  it("should create and retrieve claims by videoId", async () => {
    const videoId = "video-test-123";

    const createdClaim = await createClaimRecord({
      videoId,
      timestampSeconds: 45,
      rawText: "Turmeric cures diabetes within 30 days.",
      category: "health",
      status: "pending",
    });

    expect(createdClaim.id).toBeDefined();
    expect(createdClaim.rawText).toBe("Turmeric cures diabetes within 30 days.");

    const retrievedClaims = await findClaimsByVideoId(videoId);
    expect(retrievedClaims).toHaveLength(1);
    expect(retrievedClaims[0]?.id).toBe(createdClaim.id);
  });

  it("should create and retrieve evidence by claimId", async () => {
    const claimId = "claim-test-123";

    const createdEvidence = await createEvidenceRecord({
      claimId,
      sourceType: "fact_check_api",
      sourceUrl: "https://factcheck.org/entry/1",
      sourceDomain: "factcheck.org",
      sourceAuthorityScore: 1.0,
      matchedText: "Clinical trials showed no evidence that turmeric reverses diabetes.",
      groundingSimilarity: 0.9,
      rawResponseCachePath: "/data/cache/claim_test_123_fact_check.json",
    });

    expect(createdEvidence.id).toBeDefined();

    const retrievedEvidenceList = await findEvidenceByClaimId(claimId);
    expect(retrievedEvidenceList).toHaveLength(1);
    expect(retrievedEvidenceList[0]?.sourceDomain).toBe("factcheck.org");
  });

  it("should create and retrieve verdict by claimId and assemble full ledger", async () => {
    const videoId = "video-ledger-test";

    const claim = await createClaimRecord({
      videoId,
      timestampSeconds: 10,
      rawText: "Test financial claim",
      category: "financial",
      status: "resolved",
    });

    await createEvidenceRecord({
      claimId: claim.id,
      sourceType: "serpapi_finance",
      sourceUrl: "https://finance.google.com",
      sourceDomain: "finance.google.com",
      sourceAuthorityScore: 1.0,
      matchedText: "Stock is trading at 150.",
      groundingSimilarity: 0.8,
      rawResponseCachePath: "/data/cache/test_evidence.json",
    });

    await createVerdictRecord({
      claimId: claim.id,
      trustScore: 0.8,
      confidenceLabel: "high_confidence",
      verifiedClaimText: "Test financial claim",
      conflictingClaims: [],
    });

    const singleVerdict = await findVerdictByClaimId(claim.id);
    expect(singleVerdict).not.toBeNull();
    expect(singleVerdict?.trustScore).toBe(0.8);

    const fullLedger = await findFullClaimLedgerByVideoId(videoId);
    expect(fullLedger).toHaveLength(1);
    expect(fullLedger[0]?.claim.id).toBe(claim.id);
    expect(fullLedger[0]?.evidence).toHaveLength(1);
    expect(fullLedger[0]?.verdict?.confidenceLabel).toBe("high_confidence");
  });
});
