import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createExpressApplication } from "../app.js";
import * as stage1Module from "../pipeline/stages/stage-1-transcript.js";
import { clearInMemoryVideoStore, createVideoRecord } from "../repositories/video-repository.js";

describe("Video Controller HTTP Integration", () => {
  const application = createExpressApplication();

  beforeEach(() => {
    clearInMemoryVideoStore();
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

  it("should return 200 with structured transcript data on valid YouTube URL", async () => {
    vi.spyOn(stage1Module, "executeStage1TranscriptFetching").mockResolvedValueOnce({
      videoRecord: {
        id: "123e4567-e89b-12d3-a456-426614174000",
        youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        youtubeVideoId: "dQw4w9WgXcQ",
        title: "Rick Astley - Never Gonna Give You Up",
        processedAt: null,
      },
      transcriptSegments: [
        { start: 0.1, duration: 2.0, text: "We're no strangers to love" },
      ],
      cacheStatus: "live_api_fetch",
      rawResponseCachePath: "/data/cache/dQw4w9WgXcQ_transcript.json",
    });

    const httpResponse = await request(application)
      .post("/api/videos/process")
      .send({
        youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        videoTitle: "Rick Astley - Never Gonna Give You Up",
      });

    expect(httpResponse.status).toBe(200);
    expect(httpResponse.body.youtubeVideoId).toBe("dQw4w9WgXcQ");
    expect(httpResponse.body.cacheStatus).toBe("live_api_fetch");
    expect(httpResponse.body.segmentCount).toBe(1);
    expect(httpResponse.body.transcriptSegments[0].text).toBe("We're no strangers to love");
  });

  it("should return 404 when querying an unknown video ID", async () => {
    const httpResponse = await request(application)
      .get("/api/videos/unknown_video_id");

    expect(httpResponse.status).toBe(404);
    expect(httpResponse.body.error.code).toBe("RESOURCE_NOT_FOUND");
  });

  it("should return 200 when querying an existing video record", async () => {
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
  });
});
