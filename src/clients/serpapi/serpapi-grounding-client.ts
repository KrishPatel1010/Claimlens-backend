import { currentEnvironment } from "../../config/environment.js";
import { systemLogger } from "../../utils/logger.js";
import type { SourceType } from "../../domain/scoring/scoring-calculator.js";

export interface GroundingEvidenceMatch {
  sourceType: SourceType;
  sourceUrl: string | null;
  sourceDomain: string | null;
  matchedText: string | null;
  rawResponse: unknown;
}

export const fetchScholarGrounding = async (
  queryText: string,
): Promise<GroundingEvidenceMatch | null> => {
  const apiKey = currentEnvironment.SERPAPI_KEY;

  if (!apiKey || apiKey.trim().length === 0) {
    systemLogger.info("SERPAPI_KEY not configured. Skipping live Google Scholar lookup.");
    return null;
  }

  const queryParameters = new URLSearchParams({
    engine: "google_scholar",
    q: queryText,
    api_key: apiKey,
  });

  try {
    const response = await fetch(`https://serpapi.com/search.json?${queryParameters.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      organic_results?: Array<{
        title?: string;
        link?: string;
        snippet?: string;
        publication_info?: { summary?: string };
      }>;
    };

    const firstResult = payload.organic_results?.[0];
    if (!firstResult) {
      return null;
    }

    let sourceDomain: string | null = null;
    if (firstResult.link) {
      try {
        sourceDomain = new URL(firstResult.link).hostname;
      } catch {
        sourceDomain = null;
      }
    }

    return {
      sourceType: "serpapi_scholar",
      sourceUrl: firstResult.link ?? null,
      sourceDomain,
      matchedText: firstResult.snippet ?? firstResult.title ?? null,
      rawResponse: payload,
    };
  } catch (networkError) {
    systemLogger.warn("SerpApi Google Scholar request failed.", {
      errorMessage: networkError instanceof Error ? networkError.message : String(networkError),
    });
    return null;
  }
};

export const fetchFinanceGrounding = async (
  entityOrTicker: string,
): Promise<GroundingEvidenceMatch | null> => {
  const apiKey = currentEnvironment.SERPAPI_KEY;

  if (!apiKey || apiKey.trim().length === 0) {
    return null;
  }

  const queryParameters = new URLSearchParams({
    engine: "google_finance",
    q: entityOrTicker,
    api_key: apiKey,
  });

  try {
    const response = await fetch(`https://serpapi.com/search.json?${queryParameters.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      summary?: { title?: string; price?: string };
      knowledge_graph?: { title?: string; description?: string };
    };

    const matchedSnippet =
      payload.knowledge_graph?.description ??
      payload.summary?.price ??
      payload.summary?.title ??
      null;

    return {
      sourceType: "serpapi_finance",
      sourceUrl: `https://www.google.com/finance/quote/${entityOrTicker}`,
      sourceDomain: "google.com/finance",
      matchedText: matchedSnippet,
      rawResponse: payload,
    };
  } catch (networkError) {
    systemLogger.warn("SerpApi Google Finance request failed.", {
      errorMessage: networkError instanceof Error ? networkError.message : String(networkError),
    });
    return null;
  }
};

export const fetchWebSearchGrounding = async (
  queryText: string,
): Promise<GroundingEvidenceMatch | null> => {
  const apiKey = currentEnvironment.SERPAPI_KEY;

  if (!apiKey || apiKey.trim().length === 0) {
    return null;
  }

  const queryParameters = new URLSearchParams({
    engine: "google",
    q: queryText,
    api_key: apiKey,
  });

  try {
    const response = await fetch(`https://serpapi.com/search.json?${queryParameters.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      organic_results?: Array<{
        title?: string;
        link?: string;
        snippet?: string;
      }>;
    };

    const firstResult = payload.organic_results?.[0];
    if (!firstResult) {
      return null;
    }

    let sourceDomain: string | null = null;
    if (firstResult.link) {
      try {
        sourceDomain = new URL(firstResult.link).hostname;
      } catch {
        sourceDomain = null;
      }
    }

    return {
      sourceType: "serpapi_search",
      sourceUrl: firstResult.link ?? null,
      sourceDomain,
      matchedText: firstResult.snippet ?? firstResult.title ?? null,
      rawResponse: payload,
    };
  } catch (networkError) {
    systemLogger.warn("SerpApi Google Search request failed.", {
      errorMessage: networkError instanceof Error ? networkError.message : String(networkError),
    });
    return null;
  }
};
