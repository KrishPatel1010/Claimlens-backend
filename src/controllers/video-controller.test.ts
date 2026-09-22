import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createExpressApplication } from "../app.js";
import * as pipelineOrchestratorModule from "../pipeline/pipeline-orchestrator.js";
import { clearInMemoryVideoStore, createVideoRecord } from "../repositories/video-repository.js";
import { clearInMemoryClaimStores } from "../repositories/claim-repository.js";

describe("Video Controller HTTP Integration", () => {
  const application = createExpressApplication();

  beforeEach(() => {
    clearInMemoryVideoStore();
    clearInMemoryClaimStores();
    vi.restoreAllMocks();
  });

  it("should return 400 when youtubeUrl is missing from the request body", async () => {
    const httpResponse = await request(application)
      .post("/api/videos/process")
      .send({});

    expect(httpResponse.status).toBe(400);
    expect(httpResponse.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should return 400 when an SSRF non-YouTube domain is submitted", async () => {
    const httpResponse = await request(application)
      .post("/api/videos/process")
      .send({
        youtubeUrl: "http://malicious-site.internal/watch?v=dQw4w9WgXcQ",
      });

    expect(httpResponse.status).toBe(400);
    expect(httpResponse.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should return 200 with structured verified claim ledger on valid YouTube URL", async () => {
    vi.spyOn(pipelineOrchestratorModule, "executeVerificationPipeline").mockResolvedValueOnce({
      video: {
        id: "123e4567-e89b-12d3-a456-426614174000",
        youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        youtubeVideoId: "dQw4w9WgXcQ",
        title: "Rick Astley - Never Gonna Give You Up",
        processedAt: new Date(),
      },
      claimsCount: 1,
      verifiedLedger: [
        {
          claimId: "claim-uuid-1",
          timestampSeconds: 12,
          rawText: "Drinking green tea burns 500 calories per day.",
          category: "health",
          trustScore: 0.85,
          confidenceLabel: "high_confidence",
          verifiedClaimText: "Drinking green tea burns 500 calories per day.",
          evidence: [
            {
              sourceType: "serpapi_scholar",
              sourceUrl: "https://scholar.google.com/article1",
              sourceDomain: "nih.gov",
              sourceAuthorityScore: 1.0,
              matchedText: "Green tea catechins show modest metabolic rate increases.",
              groundingSimilarity: 0.85,
              rawResponseCachePath: "/data/cache/claim-uuid-1_serpapi_scholar.json",
            },
          ],
          conflictingClaims: [],
        },
      ],
      cacheSummary: {
        videoCacheStatus: "live_api_fetch",
        cachedClaimsCount: 0,
        liveGroundingCount: 1,
      },
    });

    const httpResponse = await request(application)
      .post("/api/videos/process")
      .send({
        youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        videoTitle: "Rick Astley - Never Gonna Give You Up",
      });

    expect(httpResponse.status).toBe(200);
    expect(httpResponse.body.youtubeVideoId).toBe("dQw4w9WgXcQ");
    expect(httpResponse.body.claimsCount).toBe(1);
    expect(httpResponse.body.verifiedLedger).toHaveLength(1);
    expect(httpResponse.body.verifiedLedger[0].trustScore).toBe(0.85);
    expect(httpResponse.body.verifiedLedger[0].confidenceLabel).toBe("high_confidence");
  });

  it("should return 404 when querying an unknown video ID", async () => {
    const httpResponse = await request(application)
      .get("/api/videos/unknown_video_id");

    expect(httpResponse.status).toBe(404);
    expect(httpResponse.body.error.code).toBe("RESOURCE_NOT_FOUND");
  });

  it("should return 200 when querying an existing video record with empty ledger", async () => {
    await createVideoRecord({
      youtubeVideoId: "existing_id1",
      youtubeUrl: "https://www.youtube.com/watch?v=existing_id1",
      title: "Existing Video",
      processedAt: new Date(),
    });

    const httpResponse = await request(application)
      .get("/api/videos/existing_id1");

    expect(httpResponse.status).toBe(200);
    expect(httpResponse.body.video.youtubeVideoId).toBe("existing_id1");
    expect(httpResponse.body.ledger).toEqual([]);
  });
});
