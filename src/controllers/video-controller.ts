import type { Request, Response, NextFunction } from "express";
import { processVideoRequestSchema } from "../schemas/video-requests.schema.js";
import { extractYouTubeVideoId } from "../utils/youtube-url-parser.js";
import { executeStage1TranscriptFetching } from "../pipeline/stages/stage-1-transcript.js";
import { findVideoByYouTubeId } from "../repositories/video-repository.js";
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
    const extractedVideoId = extractYouTubeVideoId(youtubeUrl);

    const stage1Result = await executeStage1TranscriptFetching({
      youtubeVideoId: extractedVideoId,
      youtubeUrl,
      videoTitle: videoTitle ?? null,
    });

    outgoingHttpResponse.status(200).json({
      videoId: stage1Result.videoRecord.id,
      youtubeVideoId: stage1Result.videoRecord.youtubeVideoId,
      youtubeUrl: stage1Result.videoRecord.youtubeUrl,
      title: stage1Result.videoRecord.title,
      cacheStatus: stage1Result.cacheStatus,
      rawResponseCachePath: stage1Result.rawResponseCachePath,
      segmentCount: stage1Result.transcriptSegments.length,
      transcriptSegments: stage1Result.transcriptSegments,
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

    outgoingHttpResponse.status(200).json({
      video: foundVideoRecord,
    });
  } catch (caughtError) {
    nextMiddlewareFunction(caughtError);
  }
};
