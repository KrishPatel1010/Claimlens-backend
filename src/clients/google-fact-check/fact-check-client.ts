import { z } from "zod";
import { currentEnvironment } from "../../config/environment.js";
import { systemLogger } from "../../utils/logger.js";

export const factCheckReviewSchema = z.object({
  publisher: z
    .object({
      name: z.string().optional(),
      site: z.string().optional(),
    })
    .optional(),
  url: z.string().optional(),
  title: z.string().optional(),
  reviewDate: z.string().optional(),
  textualRating: z.string().optional(),
  languageCode: z.string().optional(),
});

export const factCheckClaimItemSchema = z.object({
  text: z.string().optional(),
  claimant: z.string().optional(),
  claimDate: z.string().optional(),
  claimReview: z.array(factCheckReviewSchema).optional(),
});

export const factCheckSearchResponseSchema = z.object({
  claims: z.array(factCheckClaimItemSchema).optional().default([]),
  nextPageToken: z.string().optional(),
});

export type FactCheckSearchResponse = z.infer<typeof factCheckSearchResponseSchema>;
export type FactCheckClaimItem = z.infer<typeof factCheckClaimItemSchema>;
export type FactCheckReview = z.infer<typeof factCheckReviewSchema>;

export interface FactCheckMatchResult {
  hasMatch: boolean;
  publisherName: string | null;
  textualRating: string | null;
  sourceUrl: string | null;
  sourceDomain: string | null;
  matchedText: string | null;
  rawResponse: FactCheckSearchResponse;
}

export const searchGoogleFactCheck = async (
  claimQueryText: string,
): Promise<FactCheckMatchResult> => {
  const apiKey = currentEnvironment.GOOGLE_FACT_CHECK_KEY;

  if (!apiKey || apiKey.trim().length === 0) {
    systemLogger.info(
      "GOOGLE_FACT_CHECK_KEY not configured. Skipping live Fact Check API lookup.",
    );
    return {
      hasMatch: false,
      publisherName: null,
      textualRating: null,
      sourceUrl: null,
      sourceDomain: null,
      matchedText: null,
      rawResponse: { claims: [] },
    };
  }

  const queryParameters = new URLSearchParams({
    query: claimQueryText,
    key: apiKey,
    languageCode: "en",
  });

  const requestUrl = `https://factchecktools.googleapis.com/v1alpha1/claims:search?${queryParameters.toString()}`;

  try {
    const httpResponse = await fetch(requestUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!httpResponse.ok) {
      systemLogger.warn(
        `Google Fact Check API returned HTTP ${httpResponse.status} for query '${claimQueryText}'.`,
      );
      return {
        hasMatch: false,
        publisherName: null,
        textualRating: null,
        sourceUrl: null,
        sourceDomain: null,
        matchedText: null,
        rawResponse: { claims: [] },
      };
    }

    const responseJson: unknown = await httpResponse.json();
    const parseResult = factCheckSearchResponseSchema.safeParse(responseJson);

    if (!parseResult.success) {
      systemLogger.warn("Failed to parse Google Fact Check API response schema.", {
        issues: parseResult.error.errors,
      });
      return {
        hasMatch: false,
        publisherName: null,
        textualRating: null,
        sourceUrl: null,
        sourceDomain: null,
        matchedText: null,
        rawResponse: { claims: [] },
      };
    }

    const candidateClaims = parseResult.data.claims ?? [];
    if (candidateClaims.length === 0) {
      return {
        hasMatch: false,
        publisherName: null,
        textualRating: null,
        sourceUrl: null,
        sourceDomain: null,
        matchedText: null,
        rawResponse: parseResult.data,
      };
    }

    const firstMatchingClaim = candidateClaims[0];
    const topReview = firstMatchingClaim?.claimReview?.[0];

    let extractedDomain: string | null = null;
    if (topReview?.url) {
      try {
        extractedDomain = new URL(topReview.url).hostname;
      } catch {
        extractedDomain = topReview.publisher?.site ?? null;
      }
    }

    return {
      hasMatch: true,
      publisherName: topReview?.publisher?.name ?? null,
      textualRating: topReview?.textualRating ?? null,
      sourceUrl: topReview?.url ?? null,
      sourceDomain: extractedDomain,
      matchedText: firstMatchingClaim?.text ?? topReview?.title ?? null,
      rawResponse: parseResult.data,
    };
  } catch (networkError) {
    systemLogger.warn("Google Fact Check API network request failed.", {
      errorMessage: networkError instanceof Error ? networkError.message : String(networkError),
    });
    return {
      hasMatch: false,
      publisherName: null,
      textualRating: null,
      sourceUrl: null,
      sourceDomain: null,
      matchedText: null,
      rawResponse: { claims: [] },
    };
  }
};
