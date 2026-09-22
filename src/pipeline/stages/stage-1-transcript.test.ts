import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { executeStage1TranscriptFetching } from "./stage-1-transcript.js";
import { clearInMemoryVideoStore } from "../../repositories/video-repository.js";
import { clearInMemoryFallbackCache } from "../../cache/redis-client.js";
import * as serpApiClientModule from "../../clients/serpapi/serpapi-client.js";
import { getCacheFilePath } from "../../cache/disk-cache-manager.js";
import { existsSync, promises as fsPromises } from "node:fs";

describe("Pipeline Stage 1: Transcript Fetching", () => {
  const sampleVideoId = "testVideo123";
  const sampleUrl = `https://www.youtube.com/watch?v=${sampleVideoId}`;

  beforeEach(() => {
    clearInMemoryVideoStore();
    clearInMemoryFallbackCache();
  });

  afterEach(async () => {
    const testDiskFile = getCacheFilePath(`${sampleVideoId}_transcript`);
    if (existsSync(testDiskFile)) {
      await fsPromises.unlink(testDiskFile);
    }
  });

  it("should fetch live transcript via SerpApi on first call, write to disk, and return live_api_fetch status", async () => {
    const mockFetchSpy = vi
      .spyOn(serpApiClientModule, "fetchYouTubeTranscriptFromSerpApi")
      .mockResolvedValueOnce({
        search_metadata: { status: "Success" },
        transcript: [
          { start: 0.5, dur: 2.1, text: "Hello and welcome back to the channel." },
          { start: 2.6, dur: 3.4, text: "Today we are analyzing turmeric and diabetes." },
        ],
      });

    const result = await executeStage1TranscriptFetching({
      youtubeVideoId: sampleVideoId,
      youtubeUrl: sampleUrl,
      videoTitle: "Sample Health Video",
    });

    expect(mockFetchSpy).toHaveBeenCalledTimes(1);
    expect(result.cacheStatus).toBe("live_api_fetch");
    expect(result.transcriptSegments).toHaveLength(2);
    expect(result.transcriptSegments[0]?.text).toBe("Hello and welcome back to the channel.");
    expect(result.videoRecord.youtubeVideoId).toBe(sampleVideoId);

    // Verify disk cache file was created
    expect(existsSync(getCacheFilePath(`${sampleVideoId}_transcript`))).toBe(true);

    // Second call should hit the hot-cache (0 API calls, 0 SerpApi credits consumed)
    const secondResult = await executeStage1TranscriptFetching({
      youtubeVideoId: sampleVideoId,
      youtubeUrl: sampleUrl,
    });

    expect(mockFetchSpy).toHaveBeenCalledTimes(1); // Still only 1 call
    expect(secondResult.cacheStatus).toBe("hot_cache_hit");
    expect(secondResult.transcriptSegments).toHaveLength(2);
  });
});
