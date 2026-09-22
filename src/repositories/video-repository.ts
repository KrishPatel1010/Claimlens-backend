import { eq } from "drizzle-orm";
import { getDatabaseClient } from "./database-client.js";
import {
  videos,
  type VideoRecord,
  type InsertVideoRecord,
} from "../schemas/database.schema.js";
import { systemLogger } from "../utils/logger.js";
import { randomUUID } from "node:crypto";

const inMemoryVideoStore = new Map<string, VideoRecord>();

export const findVideoByYouTubeId = async (
  youtubeVideoId: string,
): Promise<VideoRecord | null> => {
  const databaseClient = getDatabaseClient();

  if (databaseClient !== null) {
    try {
      const queriedVideoRows = await databaseClient
        .select()
        .from(videos)
        .where(eq(videos.youtubeVideoId, youtubeVideoId))
        .limit(1);

      const foundVideoRecord = queriedVideoRows[0] ?? null;
      if (foundVideoRecord !== null) {
        return foundVideoRecord;
      }
    } catch (databaseQueryError) {
      systemLogger.warn(
        `Database query failed for youtubeVideoId '${youtubeVideoId}'. Falling back to in-memory video store.`,
        { error: databaseQueryError instanceof Error ? databaseQueryError.message : String(databaseQueryError) },
      );
    }
  }

  const inMemoryVideoRecord = inMemoryVideoStore.get(youtubeVideoId) ?? null;
  return inMemoryVideoRecord;
};

export const createVideoRecord = async (
  insertVideoData: InsertVideoRecord,
): Promise<VideoRecord> => {
  const databaseClient = getDatabaseClient();

  if (databaseClient !== null) {
    try {
      const insertedVideoRows = await databaseClient
        .insert(videos)
        .values(insertVideoData)
        .returning();

      const createdVideoRecord = insertedVideoRows[0];
      if (createdVideoRecord !== undefined) {
        inMemoryVideoStore.set(createdVideoRecord.youtubeVideoId, createdVideoRecord);
        return createdVideoRecord;
      }
    } catch (databaseInsertError) {
      systemLogger.warn(
        `Database insertion failed for youtubeVideoId '${insertVideoData.youtubeVideoId}'. Falling back to in-memory store.`,
        { error: databaseInsertError instanceof Error ? databaseInsertError.message : String(databaseInsertError) },
      );
    }
  }

  const generatedVideoId = insertVideoData.id ?? randomUUID();
  const fallbackVideoRecord: VideoRecord = {
    id: generatedVideoId,
    youtubeUrl: insertVideoData.youtubeUrl,
    youtubeVideoId: insertVideoData.youtubeVideoId,
    title: insertVideoData.title ?? null,
    processedAt: insertVideoData.processedAt ?? null,
  };

  inMemoryVideoStore.set(fallbackVideoRecord.youtubeVideoId, fallbackVideoRecord);
  return fallbackVideoRecord;
};

export const markVideoAsProcessed = async (
  youtubeVideoId: string,
): Promise<VideoRecord | null> => {
  const processedTimestamp = new Date();
  const databaseClient = getDatabaseClient();

  if (databaseClient !== null) {
    try {
      const updatedVideoRows = await databaseClient
        .update(videos)
        .set({ processedAt: processedTimestamp })
        .where(eq(videos.youtubeVideoId, youtubeVideoId))
        .returning();

      const updatedVideoRecord = updatedVideoRows[0] ?? null;
      if (updatedVideoRecord !== null) {
        inMemoryVideoStore.set(youtubeVideoId, updatedVideoRecord);
        return updatedVideoRecord;
      }
    } catch (databaseUpdateError) {
      systemLogger.warn(
        `Database update failed for youtubeVideoId '${youtubeVideoId}'. Updating in-memory store only.`,
        { error: databaseUpdateError instanceof Error ? databaseUpdateError.message : String(databaseUpdateError) },
      );
    }
  }

  const existingInMemoryRecord = inMemoryVideoStore.get(youtubeVideoId);
  if (existingInMemoryRecord !== undefined) {
    const updatedInMemoryRecord: VideoRecord = {
      ...existingInMemoryRecord,
      processedAt: processedTimestamp,
    };
    inMemoryVideoStore.set(youtubeVideoId, updatedInMemoryRecord);
    return updatedInMemoryRecord;
  }

  return null;
};

export const clearInMemoryVideoStore = (): void => {
  inMemoryVideoStore.clear();
};
