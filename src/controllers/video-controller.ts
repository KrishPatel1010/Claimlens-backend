import type { Request, Response, NextFunction } from "express";
import { processVideoRequestSchema } from "../schemas/video-requests.schema.js";
import { executeVerificationPipeline } from "../pipeline/pipeline-orchestrator.js";
import { findVideoByYouTubeId } from "../repositories/video-repository.js";
import { findFullClaimLedgerByVideoId } from "../repositories/claim-repository.js";
import { createValidationError, createNotFoundError } from "../errors/app-error.js";

export const processVideoHandler = async (
  incomingHttpRequest: Request,
  outgoingHttpResponse: Response,
  nextMiddlewareFunction: NextFunction,
): Promise<void> => {
  try {
    const parseResult = processVideoRequestSchema.safeParse(incomingHttpRequest.body);

    if (!parseResult.success) {
      const issueDetails = parseResult.error.errors.map((validationIssue) => ({
        fieldPath: validationIssue.path.join("."),
        issueMessage: validationIssue.message,
      }));
      throw createValidationError("Request validation failed", issueDetails);
    }

    const { youtubeUrl, videoTitle } = parseResult.data;

    const pipelineResult = await executeVerificationPipeline({
      youtubeUrl,
      videoTitle: videoTitle ?? null,
    });

    outgoingHttpResponse.status(200).json({
      videoId: pipelineResult.video.id,
      youtubeVideoId: pipelineResult.video.youtubeVideoId,
      youtubeUrl: pipelineResult.video.youtubeUrl,
      title: pipelineResult.video.title,
      processedAt: pipelineResult.video.processedAt,
      claimsCount: pipelineResult.claimsCount,
      verifiedLedger: pipelineResult.verifiedLedger,
      cacheSummary: pipelineResult.cacheSummary,
    });
  } catch (caughtError) {
    nextMiddlewareFunction(caughtError);
  }
};

export const getVideoDetailsHandler = async (
  incomingHttpRequest: Request,
  outgoingHttpResponse: Response,
  nextMiddlewareFunction: NextFunction,
): Promise<void> => {
  try {
    const requestedVideoId = incomingHttpRequest.params["videoId"];

    if (!requestedVideoId || requestedVideoId.trim().length === 0) {
      throw createValidationError("A videoId URL parameter must be provided.");
    }

    const foundVideoRecord = await findVideoByYouTubeId(requestedVideoId);

    if (foundVideoRecord === null) {
      throw createNotFoundError("Video", requestedVideoId);
    }

    const fullClaimLedger = await findFullClaimLedgerByVideoId(foundVideoRecord.id);

    outgoingHttpResponse.status(200).json({
      video: foundVideoRecord,
      ledger: fullClaimLedger,
    });
  } catch (caughtError) {
    nextMiddlewareFunction(caughtError);
  }
};
