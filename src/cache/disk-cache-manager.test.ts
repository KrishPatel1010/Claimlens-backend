import { describe, it, expect, afterAll } from "vitest";
import {
  writeRawResponseToDisk,
  readRawResponseFromDisk,
  hasRawResponseOnDisk,
  getCacheFilePath,
} from "./disk-cache-manager.js";
import { promises as fsPromises, existsSync } from "node:fs";

describe("Disk Cache Manager", () => {
  const testFileName = "test_raw_evidence_entry";
  const testPayload = {
    testClaimId: "123e4567-e89b-12d3-a456-426614174000",
    source: "serpapi_scholar",
    resultsCount: 5,
    sampleSnippet: "Turmeric showed no significant effect on glucose control in meta-analysis.",
  };

  afterAll(async () => {
    const testFilePath = getCacheFilePath(testFileName);
    if (existsSync(testFilePath)) {
      await fsPromises.unlink(testFilePath);
    }
  });

  it("should write raw API response payload to disk and verify file existence", async () => {
    const writtenFilePath = await writeRawResponseToDisk(testFileName, testPayload);

    expect(writtenFilePath.endsWith(".json")).toBe(true);
    expect(hasRawResponseOnDisk(testFileName)).toBe(true);
  });

  it("should read back the exact payload written to disk", async () => {
    const retrievedPayload = await readRawResponseFromDisk<typeof testPayload>(testFileName);

    expect(retrievedPayload).not.toBeNull();
    expect(retrievedPayload?.testClaimId).toBe(testPayload.testClaimId);
    expect(retrievedPayload?.source).toBe("serpapi_scholar");
    expect(retrievedPayload?.resultsCount).toBe(5);
  });

  it("should return null when reading a non-existent file", async () => {
    const missingPayload = await readRawResponseFromDisk("non_existent_cache_entry");
    expect(missingPayload).toBeNull();
    expect(hasRawResponseOnDisk("non_existent_cache_entry")).toBe(false);
  });
});
