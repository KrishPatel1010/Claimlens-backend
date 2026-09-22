import {
  fetchYouTubeTranscriptFromSerpApi,
  normalizeTranscriptSegments,
  type NormalizedTranscriptSegment,
  type SerpApiTranscriptResponse,
} from "../../clients/serpapi/serpapi-client.js";
import {
  writeRawResponseToDisk,
  readRawResponseFromDisk,
} from "../../cache/disk-cache-manager.js";
import {
  getCachedVideoAnalysis,
  setCachedVideoAnalysis,
} from "../../cache/cache-manager.js";
import {
  findVideoByYouTubeId,
  createVideoRecord,
} from "../../repositories/video-repository.js";
import type { VideoRecord } from "../../schemas/database.schema.js";
import { systemLogger } from "../../utils/logger.js";
import { createValidationError } from "../../errors/app-error.js";

export interface Stage1TranscriptInput {
  youtubeVideoId: string;
  youtubeUrl: string;
  videoTitle?: string | null | undefined;
}

export interface Stage1TranscriptResult {
  videoRecord: VideoRecord;
  transcriptSegments: NormalizedTranscriptSegment[];
  cacheStatus: "hot_cache_hit" | "disk_cache_hit" | "live_api_fetch";
  rawResponseCachePath: string | null;
}

export const executeStage1TranscriptFetching = async (
  stageInput: Stage1TranscriptInput,
): Promise<Stage1TranscriptResult> => {
  const { youtubeVideoId, youtubeUrl, videoTitle } = stageInput;

  // Step 1: Check Redis Hot Cache & Supabase via 4-tier cache manager
  const cachedAnalysis = await getCachedVideoAnalysis(youtubeVideoId);
  if (cachedAnalysis !== null) {
    systemLogger.info(`Cache hit for video '${youtubeVideoId}' in hot-cache.`);
    return {
      videoRecord: cachedAnalysis.videoRecord,
      transcriptSegments: cachedAnalysis.transcriptSegments,
      cacheStatus: "hot_cache_hit",
      rawResponseCachePath: null,
    };
  }

  // Step 2: Check disk cache for pre-cached raw SerpApi response (demo video dataset / repo cache)
  const diskCachedPayload = await readRawResponseFromDisk<SerpApiTranscriptResponse>(
    `${youtubeVideoId}_transcript`,
  );

  if (diskCachedPayload !== null) {
    systemLogger.info(`Found pre-cached transcript on disk for video '${youtubeVideoId}'.`);
    const normalizedSegments = normalizeTranscriptSegments(diskCachedPayload);

    let existingVideoRecord = await findVideoByYouTubeId(youtubeVideoId);
    if (existingVideoRecord === null) {
      existingVideoRecord = await createVideoRecord({
        youtubeUrl,
        youtubeVideoId,
        title: videoTitle ?? null,
        processedAt: null,
      });
    }

    await setCachedVideoAnalysis(youtubeVideoId, {
      videoRecord: existingVideoRecord,
      transcriptSegments: normalizedSegments,
    });

    return {
      videoRecord: existingVideoRecord,
      transcriptSegments: normalizedSegments,
      cacheStatus: "disk_cache_hit",
      rawResponseCachePath: `/data/cache/${youtubeVideoId}_transcript.json`,
    };
  }

  // Step 3: Cache miss — Execute live SerpApi call (1 credit consumed)
  systemLogger.info(`Cache miss for video '${youtubeVideoId}'. Executing live SerpApi transcript lookup.`);
  const liveTranscriptResponse = await fetchYouTubeTranscriptFromSerpApi(youtubeVideoId);

  const normalizedSegments = normalizeTranscriptSegments(liveTranscriptResponse);
  if (normalizedSegments.length === 0) {
    throw createValidationError(
      `No transcript content could be extracted for video ID '${youtubeVideoId}'. The video may have captions disabled.`,
    );
  }

  // Step 4: Write raw response directly to disk cache
  const rawDiskPath = await writeRawResponseToDisk(
    `${youtubeVideoId}_transcript`,
    liveTranscriptResponse,
  );

  // Step 5: Persist video record to database repository
  let persistedVideoRecord = await findVideoByYouTubeId(youtubeVideoId);
  if (persistedVideoRecord === null) {
    persistedVideoRecord = await createVideoRecord({
      youtubeUrl,
      youtubeVideoId,
      title: videoTitle ?? null,
      processedAt: null,
    });
  }

  // Step 6: Write-through cache to Redis
  await setCachedVideoAnalysis(youtubeVideoId, {
      videoRecord: persistedVideoRecord,
      transcriptSegments: normalizedSegments,
  });

  return {
    videoRecord: persistedVideoRecord,
    transcriptSegments: normalizedSegments,
    cacheStatus: "live_api_fetch",
    rawResponseCachePath: rawDiskPath,
  };
};
