import { createValidationError } from "../errors/app-error.js";

const YOUTUBE_VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

const ALLOWED_YOUTUBE_HOSTNAMES = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

export const extractYouTubeVideoId = (rawUrlInput: string): string => {
  if (!rawUrlInput || typeof rawUrlInput !== "string") {
    throw createValidationError("A valid YouTube URL must be provided as a non-empty string.");
  }

  const trimmedUrl = rawUrlInput.trim();

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmedUrl);
  } catch {
    throw createValidationError(`Invalid URL structure: '${trimmedUrl}'.`);
  }

  // SSRF Guard: Enforce HTTP/HTTPS protocols only
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw createValidationError(
      `Unsupported protocol '${parsedUrl.protocol}'. Only 'http:' and 'https:' are permitted.`,
    );
  }

  // SSRF Guard: Restrict hostname strictly to YouTube domains
  const normalizedHostname = parsedUrl.hostname.toLowerCase();
  if (!ALLOWED_YOUTUBE_HOSTNAMES.has(normalizedHostname)) {
    throw createValidationError(
      `Invalid domain '${normalizedHostname}'. Only official YouTube URLs are accepted.`,
    );
  }

  let extractedVideoId: string | null = null;

  if (normalizedHostname === "youtu.be" || normalizedHostname === "www.youtu.be") {
    // Format: https://youtu.be/{videoId}
    const cleanPathname = parsedUrl.pathname.replace(/^\/+/, "");
    const firstSegment = cleanPathname.split("/")[0] ?? "";
    extractedVideoId = firstSegment;
  } else {
    // Formats:
    // https://www.youtube.com/watch?v={videoId}
    // https://www.youtube.com/embed/{videoId}
    // https://www.youtube.com/shorts/{videoId}
    // https://www.youtube.com/v/{videoId}
    const queryParamVideoId = parsedUrl.searchParams.get("v");

    if (queryParamVideoId !== null && queryParamVideoId.length > 0) {
      extractedVideoId = queryParamVideoId;
    } else {
      const pathSegments = parsedUrl.pathname.split("/").filter((segment) => segment.length > 0);
      const actionPrefix = pathSegments[0]?.toLowerCase();

      if (actionPrefix === "embed" || actionPrefix === "shorts" || actionPrefix === "v") {
        extractedVideoId = pathSegments[1] ?? null;
      }
    }
  }

  if (!extractedVideoId || !YOUTUBE_VIDEO_ID_REGEX.test(extractedVideoId)) {
    throw createValidationError(
      "Could not extract a valid 11-character YouTube video ID from the provided URL.",
    );
  }

  return extractedVideoId;
};

export const isValidYouTubeUrl = (rawUrlInput: string): boolean => {
  try {
    extractYouTubeVideoId(rawUrlInput);
    return true;
  } catch {
    return false;
  }
};
