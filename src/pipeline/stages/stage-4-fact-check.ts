import {
  searchGoogleFactCheck,
  type FactCheckMatchResult,
} from "../../clients/google-fact-check/fact-check-client.js";
import { writeRawResponseToDisk } from "../../cache/disk-cache-manager.js";
import { systemLogger } from "../../utils/logger.js";

export interface Stage4FactCheckResult {
  hasMatch: boolean;
  sourceType: "fact_check_api" | null;
  publisherName: string | null;
  textualRating: string | null;
  sourceUrl: string | null;
  sourceDomain: string | null;
  matchedText: string | null;
  rawResponseCachePath: string | null;
}

export const executeStage4FactCheckLookup = async (
  claimId: string,
  claimText: string,
): Promise<Stage4FactCheckResult> => {
  systemLogger.info(`Stage 4: Checking Google Fact Check Tools API for claim '${claimId}'.`);

  const searchResult: FactCheckMatchResult = await searchGoogleFactCheck(claimText);

  if (searchResult.hasMatch) {
    const rawCacheFileName = `${claimId}_fact_check`;
    const targetFilePath = await writeRawResponseToDisk(
      rawCacheFileName,
      searchResult.rawResponse,
    );

    systemLogger.info(`Stage 4 Fact Check hit: Found verified review by '${searchResult.publisherName}'.`);

    return {
      hasMatch: true,
      sourceType: "fact_check_api",
      publisherName: searchResult.publisherName,
      textualRating: searchResult.textualRating,
      sourceUrl: searchResult.sourceUrl,
      sourceDomain: searchResult.sourceDomain,
      matchedText: searchResult.matchedText,
      rawResponseCachePath: targetFilePath,
    };
  }

  return {
    hasMatch: false,
    sourceType: null,
    publisherName: null,
    textualRating: null,
    sourceUrl: null,
    sourceDomain: null,
    matchedText: null,
    rawResponseCachePath: null,
  };
};
