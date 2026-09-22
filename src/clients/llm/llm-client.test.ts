import { describe, it, expect } from "vitest";
import {
  extractClaimsWithHeuristicFallback,
  evaluateGroundingSimilarity,
} from "./llm-client.js";

describe("LLM Client & Heuristic Fallback", () => {
  it("should extract factual health claims with categories and timestamps from transcript segments", () => {
    const transcriptSegments = [
      { start: 2.5, duration: 3.0, text: "Welcome to today's medical update show." },
      { start: 6.2, duration: 4.5, text: "Turmeric cures diabetes within 30 days without insulin." },
    ];

    const extracted = extractClaimsWithHeuristicFallback(transcriptSegments);

    expect(extracted).toHaveLength(1);
    expect(extracted[0]?.category).toBe("health");
    expect(extracted[0]?.timestampSeconds).toBe(6);
    expect(extracted[0]?.rawText).toContain("Turmeric cures diabetes");
  });

  it("should categorize financial claims correctly", () => {
    const transcriptSegments = [
      { start: 10.0, duration: 4.0, text: "Bitcoin will reach 150000 by end of quarter guaranteed." },
    ];

    const extracted = extractClaimsWithHeuristicFallback(transcriptSegments);

    expect(extracted).toHaveLength(1);
    expect(extracted[0]?.category).toBe("financial");
  });

  it("should calculate grounding similarity and detect contradictory phrasing", async () => {
    const claim = "Turmeric completely reverses type 2 diabetes.";
    const contradictorySnippet = "Medical studies show no evidence that turmeric reverses diabetes, this is a dangerous myth.";

    const evalResult = await evaluateGroundingSimilarity(claim, contradictorySnippet);

    expect(evalResult.similarityScore).toBeGreaterThan(0.3);
    expect(evalResult.isContradictory).toBe(true);
  });
});
