import { z } from "zod";
import { currentEnvironment } from "../../config/environment.js";
import { createExternalApiError } from "../../errors/app-error.js";
import { systemLogger } from "../../utils/logger.js";

export const serpApiTranscriptSegmentSchema = z.object({
  start: z.coerce.number(),
  dur: z.coerce.number().optional().default(0),
  text: z.string(),
});

export type SerpApiTranscriptSegment = z.infer<typeof serpApiTranscriptSegmentSchema>;

export const serpApiTranscriptResponseSchema = z.object({
  transcript: z.array(serpApiTranscriptSegmentSchema).optional(),
  error: z.string().optional(),
  search_metadata: z
    .object({
      status: z.string().optional(),
    })
    .optional(),
});

export type SerpApiTranscriptResponse = z.infer<typeof serpApiTranscriptResponseSchema>;

export interface NormalizedTranscriptSegment {
  start: number;
  duration: number;
  text: string;
}

export const fetchYouTubeTranscriptFromSerpApi = async (
  youtubeVideoId: string,
): Promise<SerpApiTranscriptResponse> => {
  const serpApiKey = currentEnvironment.SERPAPI_KEY;

  if (!serpApiKey || serpApiKey.trim().length === 0) {
    throw createExternalApiError(
      "SerpApi",
      "SERPAPI_KEY is not configured in the environment.",
      503,
    );
  }

  const queryParameters = new URLSearchParams({
    engine: "youtube_video_transcript",
    v: youtubeVideoId,
    api_key: serpApiKey,
  });

  const requestUrl = `https://serpapi.com/search.json?${queryParameters.toString()}`;

  systemLogger.info(`Dispatching SerpApi transcript request for videoId '${youtubeVideoId}'.`);

  let httpResponse: Response;
  try {
    httpResponse = await fetch(requestUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });
  } catch (networkError) {
    systemLogger.error(`SerpApi network request failed for videoId '${youtubeVideoId}'.`, {
      errorMessage: networkError instanceof Error ? networkError.message : String(networkError),
    });
    throw createExternalApiError(
      "SerpApi",
      networkError instanceof Error ? networkError.message : "Network failure communicating with SerpApi",
    );
  }

  let responseBodyJson: unknown;
  try {
    responseBodyJson = await httpResponse.json();
  } catch {
    throw createExternalApiError("SerpApi", "Received non-JSON response payload from SerpApi.");
  }

  const parseResult = serpApiTranscriptResponseSchema.safeParse(responseBodyJson);
  if (!parseResult.success) {
    systemLogger.error("Failed to parse SerpApi transcript response payload with Zod schema.", {
      issues: parseResult.error.errors,
    });
    throw createExternalApiError("SerpApi", "Invalid response schema returned by SerpApi.");
  }

  if (parseResult.data.error) {
    throw createExternalApiError("SerpApi", parseResult.data.error, 422);
  }

  return parseResult.data;
};

export const normalizeTranscriptSegments = (
  serpApiResponse: SerpApiTranscriptResponse,
): NormalizedTranscriptSegment[] => {
  const rawSegments = serpApiResponse.transcript ?? [];

  return rawSegments.map((segmentItem) => ({
    start: Math.round(segmentItem.start * 100) / 100,
    duration: Math.round(segmentItem.dur * 100) / 100,
    text: segmentItem.text.replace(/\s+/g, " ").trim(),
  }));
};
