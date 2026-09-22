import { describe, it, expect, beforeEach } from "vitest";
import {
  findVideoByYouTubeId,
  createVideoRecord,
  markVideoAsProcessed,
  clearInMemoryVideoStore,
} from "./video-repository.js";

describe("Video Repository", () => {
  beforeEach(() => {
    clearInMemoryVideoStore();
  });

  it("should create and retrieve a video record", async () => {
    const createdRecord = await createVideoRecord({
      youtubeVideoId: "dQw4w9WgXcQ",
      youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      title: "Never Gonna Give You Up",
      processedAt: null,
    });

    expect(createdRecord.id).toBeDefined();
    expect(createdRecord.youtubeVideoId).toBe("dQw4w9WgXcQ");
    expect(createdRecord.title).toBe("Never Gonna Give You Up");
    expect(createdRecord.processedAt).toBeNull();

    const retrievedRecord = await findVideoByYouTubeId("dQw4w9WgXcQ");
    expect(retrievedRecord).not.toBeNull();
    expect(retrievedRecord?.id).toBe(createdRecord.id);
  });

  it("should return null for non-existent video records", async () => {
    const nonExistentRecord = await findVideoByYouTubeId("non_existent_id");
    expect(nonExistentRecord).toBeNull();
  });

  it("should mark a video as processed with an updated timestamp", async () => {
    await createVideoRecord({
      youtubeVideoId: "kJQP7kiw5Fk",
      youtubeUrl: "https://www.youtube.com/watch?v=kJQP7kiw5Fk",
      title: "Despacito",
      processedAt: null,
    });

    const updatedRecord = await markVideoAsProcessed("kJQP7kiw5Fk");
    expect(updatedRecord).not.toBeNull();
    expect(updatedRecord?.processedAt).toBeInstanceOf(Date);
  });
});
