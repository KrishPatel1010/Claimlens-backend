import { describe, it, expect } from "vitest";
import { searchGoogleFactCheck } from "./fact-check-client.js";

describe("Google Fact Check Client", () => {
  it("should gracefully handle unconfigured API key by returning hasMatch false", async () => {
    const result = await searchGoogleFactCheck("Turmeric cures diabetes");

    expect(result.hasMatch).toBe(false);
    expect(result.publisherName).toBeNull();
    expect(result.rawResponse).toBeDefined();
  });
});
