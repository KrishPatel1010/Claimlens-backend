import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { executeVerificationPipeline } from "./pipeline-orchestrator.js";
import { clearInMemoryVideoStore } from "../repositories/video-repository.js";
import { clearInMemoryClaimStores } from "../repositories/claim-repository.js";
import { clearInMemoryFallbackCache } from "../cache/redis-client.js";
import * as stage1Module from "./stages/stage-1-transcript.js";
import * as stage4Module from "./stages/stage-4-fact-check.js";
import { getCacheFilePath } from "../cache/disk-cache-manager.js";
import { existsSync, promises as fsPromises } from "node:fs";

describe("Pipeline Orchestrator End-to-End Execution", () => {
  const testVideoId = "dQw4w9WgXcQ";
  const testUrl = `https://www.youtube.com/watch?v=${testVideoId}`;

  beforeEach(() => {
    clearInMemoryVideoStore();
    clearInMemoryClaimStores();
    clearInMemoryFallbackCache();
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    const transcriptFile = getCacheFilePath(`${testVideoId}_transcript`);
    if (existsSync(transcriptFile)) {
      await fsPromises.unlink(transcriptFile);
    }
  });

  it("should run full 7-stage pipeline from URL to verified ledger, writing through to cache and DB", async () => {
    // Mock Stage 1 to provide 2 realistic transcript segments
    vi.spyOn(stage1Module, "executeStage1TranscriptFetching").mockResolvedValue({
      videoRecord: {
        id: "v-uuid-001",
        youtubeVideoId: testVideoId,
        youtubeUrl: testUrl,
        title: "Health Myths Debunked",
        processedAt: null,
      },
      transcriptSegments: [
        { start: 5, duration: 4, text: "Drinking green tea burns 500 calories per day effortlessly." },
      ],
      cacheStatus: "live_api_fetch",
      rawResponseCachePath: `/data/cache/${testVideoId}_transcript.json`,
    });

    // Mock Stage 4 Fact Check hit
    vi.spyOn(stage4Module, "executeStage4FactCheckLookup").mockResolvedValue({
      hasMatch: true,
      sourceType: "fact_check_api",
      publisherName: "Science Feedback",
      textualRating: "Inaccurate",
      sourceUrl: "https://sciencefeedback.co/green-tea",
      sourceDomain: "sciencefeedback.co",
      matchedText: "Green tea increases daily calorie expenditure by only 50 to 100 calories, not 500.",
      rawResponseCachePath: "/data/cache/mock_fc.json",
    });

    // First execution: executes pipeline and writes to cache
    const firstRun = await executeVerificationPipeline({
      youtubeUrl: testUrl,
      videoTitle: "Health Myths Debunked",
    });

    expect(firstRun.video.youtubeVideoId).toBe(testVideoId);
    expect(firstRun.claimsCount).toBe(1);
    expect(firstRun.verifiedLedger).toHaveLength(1);

    const firstLedgerItem = firstRun.verifiedLedger[0];
    expect(firstLedgerItem?.category).toBe("health");
    expect(firstLedgerItem?.evidence).toHaveLength(1);
    expect(firstLedgerItem?.evidence[0]?.sourceType).toBe("fact_check_api");
    expect(firstLedgerItem?.confidenceLabel).toBeDefined();

    // Second execution with same video: claims should be deduped via Redis hot cache (0 live groundings)
    const secondRun = await executeVerificationPipeline({
      youtubeUrl: testUrl,
    });

    expect(secondRun.cacheSummary.cachedClaimsCount).toBe(1);
    expect(secondRun.cacheSummary.liveGroundingCount).toBe(0);
  });
});
