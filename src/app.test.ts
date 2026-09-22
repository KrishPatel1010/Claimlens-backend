import { describe, it, expect } from "vitest";
import request from "supertest";
import { createExpressApplication } from "./app.js";
import { systemLogger, createPipelineLogger } from "./utils/logger.js";

describe("Express Application & Logging Infrastructure", () => {
  const applicationInstance = createExpressApplication();

  it("should respond with 200 OK on GET /api/health", async () => {
    const httpResponse = await request(applicationInstance).get("/api/health");

    expect(httpResponse.status).toBe(200);
    expect(httpResponse.body).toMatchObject({
      status: "healthy",
      service: "claimlens-api",
    });
    expect(typeof httpResponse.body.timestamp).toBe("string");
  });

  it("should return a structured 404 error for unknown routes", async () => {
    const httpResponse = await request(applicationInstance).get("/api/non-existent-route");

    expect(httpResponse.status).toBe(404);
    expect(httpResponse.body).toEqual({
      error: {
        code: "RESOURCE_NOT_FOUND",
        message: "Route endpoint with identifier '/api/non-existent-route' was not found.",
        details: null,
      },
    });
  });

  it("should instantiate Winston logger and pipeline logger with correct metadata", () => {
    expect(systemLogger).toBeDefined();

    const pipelineLogger = createPipelineLogger({
      pipelineStage: "stage-1-transcript",
      youtubeVideoId: "test-video-id-123",
      claimId: "test-claim-id-456",
    });

    expect(pipelineLogger).toBeDefined();
  });
});
