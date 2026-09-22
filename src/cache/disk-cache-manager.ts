import { promises as fsPromises, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { systemLogger } from "../utils/logger.js";

const resolveCacheDirectoryPath = (): string => {
  const localBackendCacheDirectory = path.resolve(process.cwd(), "data", "cache");
  if (!existsSync(localBackendCacheDirectory)) {
    mkdirSync(localBackendCacheDirectory, { recursive: true });
  }
  return localBackendCacheDirectory;
};

export const getCacheFilePath = (cacheFileName: string): string => {
  const sanitizedFileName = cacheFileName.endsWith(".json")
    ? cacheFileName
    : `${cacheFileName}.json`;
  return path.join(resolveCacheDirectoryPath(), sanitizedFileName);
};

export const writeRawResponseToDisk = async (
  cacheFileName: string,
  rawPayload: unknown,
): Promise<string> => {
  const targetFilePath = getCacheFilePath(cacheFileName);

  try {
    const formattedPayloadString = JSON.stringify(rawPayload, null, 2);
    await fsPromises.writeFile(targetFilePath, formattedPayloadString, "utf-8");
    systemLogger.info(`Successfully cached raw API response to disk: ${targetFilePath}`);
    return targetFilePath;
  } catch (fileWriteError) {
    systemLogger.error(`Failed to write raw response to disk path: ${targetFilePath}`, {
      errorMessage: fileWriteError instanceof Error ? fileWriteError.message : String(fileWriteError),
    });
    throw fileWriteError;
  }
};

export const readRawResponseFromDisk = async <TPayload>(
  cacheFileName: string,
): Promise<TPayload | null> => {
  const targetFilePath = getCacheFilePath(cacheFileName);

  if (!existsSync(targetFilePath)) {
    return null;
  }

  try {
    const rawFileContent = await fsPromises.readFile(targetFilePath, "utf-8");
    const parsedPayload = JSON.parse(rawFileContent) as TPayload;
    return parsedPayload;
  } catch (fileReadError) {
    systemLogger.warn(`Failed to read cached raw response from disk path: ${targetFilePath}`, {
      errorMessage: fileReadError instanceof Error ? fileReadError.message : String(fileReadError),
    });
    return null;
  }
};

export const hasRawResponseOnDisk = (cacheFileName: string): boolean => {
  const targetFilePath = getCacheFilePath(cacheFileName);
  return existsSync(targetFilePath);
};
