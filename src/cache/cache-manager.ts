import { getCacheValue, setCacheValue } from "./redis-client.js";
import { findVideoByYouTubeId } from "../repositories/video-repository.js";
import { readRawResponseFromDisk } from "./disk-cache-manager.js";
import type { VideoRecord } from "../schemas/database.schema.js";

export interface CachedVideoAnalysis {
  videoRecord: VideoRecord;
  transcriptSegments: Array<{
    start: number;
    duration: number;
    text: string;
  }>;
}

export const getCachedVideoAnalysis = async (
  youtubeVideoId: string,
): Promise<CachedVideoAnalysis | null> => {
  // Tier 1: Check Redis Hot Cache
  const redisCacheKey = `video:${youtubeVideoId}`;
  const hotCachedJson = await getCacheValue(redisCacheKey);

  if (hotCachedJson !== null) {
    try {
      const parsedAnalysis = JSON.parse(hotCachedJson) as CachedVideoAnalysis;
      return parsedAnalysis;
    } catch {
      // Continue to next tier if JSON is malformed
    }
  }

  // Tier 2: Check Database
  const existingVideoRecord = await findVideoByYouTubeId(youtubeVideoId);
  if (existingVideoRecord !== null && existingVideoRecord.processedAt !== null) {
    // Check if transcript exists on disk
    const diskTranscript = await readRawResponseFromDisk<Array<{
      start: number;
      duration: number;
      text: string;
    }>>(`${youtubeVideoId}_transcript`);

    if (diskTranscript !== null) {
      const videoAnalysis: CachedVideoAnalysis = {
        videoRecord: existingVideoRecord,
        transcriptSegments: diskTranscript,
      };

      // Write-through to Redis
      await setCacheValue(redisCacheKey, JSON.stringify(videoAnalysis), 86400);
      return videoAnalysis;
    }
  }

  return null;
};

export const setCachedVideoAnalysis = async (
  youtubeVideoId: string,
  analysisData: CachedVideoAnalysis,
): Promise<void> => {
  const redisCacheKey = `video:${youtubeVideoId}`;
  await setCacheValue(redisCacheKey, JSON.stringify(analysisData), 86400);
};
