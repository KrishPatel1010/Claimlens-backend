import { describe, it, expect } from "vitest";
import {
  calculateSourceAuthorityScore,
  calculateTrustScore,
  determineConfidenceLabel,
} from "./scoring-calculator.js";

describe("Domain Scoring Calculator", () => {
  describe("calculateSourceAuthorityScore", () => {
    it("should assign 1.0 to fact_check_api, serpapi_scholar, and serpapi_finance", () => {
      expect(calculateSourceAuthorityScore("fact_check_api", "snopes.com")).toBe(1.0);
      expect(calculateSourceAuthorityScore("serpapi_scholar", "scholar.google.com")).toBe(1.0);
      expect(calculateSourceAuthorityScore("serpapi_finance", "finance.google.com")).toBe(1.0);
    });

    it("should assign 1.0 to government and educational domains", () => {
      expect(calculateSourceAuthorityScore("serpapi_search", "cdc.gov")).toBe(1.0);
      expect(calculateSourceAuthorityScore("serpapi_search", "stanford.edu")).toBe(1.0);
      expect(calculateSourceAuthorityScore("serpapi_search", "www.nih.gov")).toBe(1.0);
    });

    it("should assign 0.7 to established news and financial publishers", () => {
      expect(calculateSourceAuthorityScore("serpapi_search", "reuters.com")).toBe(1.0); // in high authority set
      expect(calculateSourceAuthorityScore("serpapi_search", "nytimes.com")).toBe(0.7);
      expect(calculateSourceAuthorityScore("serpapi_search", "bbc.com")).toBe(0.7);
    });

    it("should assign 0.4 to standard indexed web pages", () => {
      expect(calculateSourceAuthorityScore("serpapi_search", "healthblog.example.com")).toBe(0.4);
    });

    it("should assign 0.1 when domain is missing or empty", () => {
      expect(calculateSourceAuthorityScore("serpapi_search", "")).toBe(0.1);
      expect(calculateSourceAuthorityScore("serpapi_search", null)).toBe(0.1);
    });
  });

  describe("calculateTrustScore", () => {
    it("should compute Grounding Score × Authority Score rounded to 2 decimal places", () => {
      const trustScore = calculateTrustScore(0.85, 0.7);
      expect(trustScore).toBe(0.6); // 0.85 * 0.7 = 0.595 -> 0.60
    });

    it("should clamp values between 0.0 and 1.0", () => {
      expect(calculateTrustScore(1.5, 1.0)).toBe(1.0);
      expect(calculateTrustScore(-0.2, 0.7)).toBe(0.0);
    });
  });

  describe("determineConfidenceLabel", () => {
    it("should return high_confidence for scores >= 0.7", () => {
      expect(determineConfidenceLabel(0.85)).toBe("high_confidence");
      expect(determineConfidenceLabel(0.70)).toBe("high_confidence");
    });

    it("should return contested for scores between 0.35 and 0.69", () => {
      expect(determineConfidenceLabel(0.55)).toBe("contested");
      expect(determineConfidenceLabel(0.35)).toBe("contested");
    });

    it("should return unverified for scores below 0.35", () => {
      expect(determineConfidenceLabel(0.25)).toBe("unverified");
      expect(determineConfidenceLabel(0.0)).toBe("unverified");
    });

    it("should flag as contested when contradictory evidence exists regardless of high score", () => {
      expect(determineConfidenceLabel(0.9, true)).toBe("contested");
    });
  });
});
