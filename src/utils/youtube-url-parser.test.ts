import { describe, it, expect } from "vitest";
import {
  extractYouTubeVideoId,
  isValidYouTubeUrl,
} from "./youtube-url-parser.js";
import { AppError } from "../errors/app-error.js";

describe("YouTube URL Parser & SSRF Guard", () => {
  it("should extract 11-char video ID from standard youtube.com watch URLs", () => {
    const testUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const extractedId = extractYouTubeVideoId(testUrl);
    expect(extractedId).toBe("dQw4w9WgXcQ");
    expect(isValidYouTubeUrl(testUrl)).toBe(true);
  });

  it("should extract video ID from youtu.be short URLs", () => {
    const testUrl = "https://youtu.be/dQw4w9WgXcQ";
    const extractedId = extractYouTubeVideoId(testUrl);
    expect(extractedId).toBe("dQw4w9WgXcQ");
    expect(isValidYouTubeUrl(testUrl)).toBe(true);
  });

  it("should extract video ID from embed URLs", () => {
    const testUrl = "https://www.youtube.com/embed/dQw4w9WgXcQ";
    const extractedId = extractYouTubeVideoId(testUrl);
    expect(extractedId).toBe("dQw4w9WgXcQ");
  });

  it("should extract video ID from shorts URLs", () => {
    const testUrl = "https://www.youtube.com/shorts/dQw4w9WgXcQ";
    const extractedId = extractYouTubeVideoId(testUrl);
    expect(extractedId).toBe("dQw4w9WgXcQ");
  });

  it("should block SSRF attempts targeting localhost or internal IPs", () => {
    const ssrfLocalhost = "http://localhost:8080/watch?v=dQw4w9WgXcQ";
    const ssrfInternalIp = "http://192.168.1.1/watch?v=dQw4w9WgXcQ";
    const ssrfMetadata = "http://169.254.169.254/latest/meta-data/";

    expect(() => extractYouTubeVideoId(ssrfLocalhost)).toThrow(AppError);
    expect(() => extractYouTubeVideoId(ssrfInternalIp)).toThrow(AppError);
    expect(() => extractYouTubeVideoId(ssrfMetadata)).toThrow(AppError);

    expect(isValidYouTubeUrl(ssrfLocalhost)).toBe(false);
    expect(isValidYouTubeUrl(ssrfInternalIp)).toBe(false);
  });

  it("should reject non-HTTP/HTTPS protocol schemes", () => {
    const fileSchemeUrl = "file:///etc/passwd";
    const javascriptSchemeUrl = "javascript:alert(1)";

    expect(() => extractYouTubeVideoId(fileSchemeUrl)).toThrow(AppError);
    expect(() => extractYouTubeVideoId(javascriptSchemeUrl)).toThrow(AppError);
  });

  it("should reject invalid, malformed, or empty URLs", () => {
    expect(() => extractYouTubeVideoId("")).toThrow(AppError);
    expect(() => extractYouTubeVideoId("not a url")).toThrow(AppError);
    expect(() => extractYouTubeVideoId("https://www.youtube.com/watch?v=too_short")).toThrow(AppError);
  });
});
