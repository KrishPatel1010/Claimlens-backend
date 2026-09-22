export type SourceType =
  | "fact_check_api"
  | "serpapi_scholar"
  | "serpapi_finance"
  | "serpapi_search";

export type ConfidenceLabel = "high_confidence" | "contested" | "unverified";

const HIGH_AUTHORITY_DOMAINS = new Set([
  "who.int",
  "cdc.gov",
  "nih.gov",
  "fda.gov",
  "ncbi.nlm.nih.gov",
  "nature.com",
  "thelancet.com",
  "nejm.org",
  "sec.gov",
  "bloomberg.com",
  "reuters.com",
]);

const ESTABLISHED_NEWS_DOMAINS = new Set([
  "nytimes.com",
  "wsj.com",
  "bbc.com",
  "apnews.com",
  "ft.com",
  "forbes.com",
  "theguardian.com",
  "cnbc.com",
]);

export const calculateSourceAuthorityScore = (
  sourceType: SourceType,
  sourceDomain: string | null | undefined,
): number => {
  if (sourceType === "fact_check_api" || sourceType === "serpapi_scholar" || sourceType === "serpapi_finance") {
    return 1.0;
  }

  if (!sourceDomain || sourceDomain.trim().length === 0) {
    return 0.1;
  }

  const cleanDomain = sourceDomain.toLowerCase().replace(/^www\./, "").trim();

  if (
    cleanDomain.endsWith(".gov") ||
    cleanDomain.endsWith(".edu") ||
    HIGH_AUTHORITY_DOMAINS.has(cleanDomain)
  ) {
    return 1.0;
  }

  if (ESTABLISHED_NEWS_DOMAINS.has(cleanDomain)) {
    return 0.7;
  }

  return 0.4;
};

export const calculateTrustScore = (
  groundingSimilarityScore: number,
  sourceAuthorityScore: number,
): number => {
  const boundedGroundingScore = Math.max(0, Math.min(1, groundingSimilarityScore));
  const boundedAuthorityScore = Math.max(0, Math.min(1, sourceAuthorityScore));
  const rawTrustScore = boundedGroundingScore * boundedAuthorityScore;
  return Math.round(rawTrustScore * 100) / 100;
};

export const determineConfidenceLabel = (
  trustScore: number,
  hasContradictoryEvidence: boolean = false,
): ConfidenceLabel => {
  if (hasContradictoryEvidence) {
    return "contested";
  }

  if (trustScore >= 0.7) {
    return "high_confidence";
  }

  if (trustScore >= 0.35) {
    return "contested";
  }

  return "unverified";
};
