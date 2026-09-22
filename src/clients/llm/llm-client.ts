import { z } from "zod";
import { currentEnvironment } from "../../config/environment.js";
import { systemLogger } from "../../utils/logger.js";
import type { NormalizedTranscriptSegment } from "../serpapi/serpapi-client.js";

export const extractedClaimSchema = z.object({
  timestampSeconds: z.number().int().nonnegative(),
  rawText: z.string().min(5),
  category: z.enum(["health", "financial", "general"]),
});

export type ExtractedClaim = z.infer<typeof extractedClaimSchema>;

export interface GroundingEvaluationResult {
  similarityScore: number;
  isContradictory: boolean;
  explanation: string;
}

const HEALTH_KEYWORDS = [
  "cure", "cures", "treatment", "diabetes", "cancer", "disease", "health", "vitamin",
  "blood pressure", "calories", "diet", "medicine", "symptom", "vaccine", "heart", "turmeric",
];

const FINANCIAL_KEYWORDS = [
  "stock", "shares", "crypto", "bitcoin", "invest", "investment", "return", "roi",
  "market", "crash", "profit", "dividend", "yield", "inflation", "fed", "recession", "target price",
];

const classifyClaimCategory = (claimText: string): "health" | "financial" | "general" => {
  const lowercaseText = claimText.toLowerCase();

  const isHealth = HEALTH_KEYWORDS.some((keyword) => lowercaseText.includes(keyword));
  if (isHealth) {
    return "health";
  }

  const isFinancial = FINANCIAL_KEYWORDS.some((keyword) => lowercaseText.includes(keyword));
  if (isFinancial) {
    return "financial";
  }

  return "general";
};

export const extractClaimsWithHeuristicFallback = (
  transcriptSegments: NormalizedTranscriptSegment[],
): ExtractedClaim[] => {
  const extractedClaims: ExtractedClaim[] = [];

  for (const segment of transcriptSegments) {
    const segmentText = segment.text.trim();

    // Check if segment contains verifiable factual statement signals (numbers, percentages, claims of fact)
    const containsNumericOrFactualClaim =
      /\b(\d+|percent|%|cure|cures|proven|causes|prevents|will reach|guaranteed|safe|effective)\b/i.test(
        segmentText,
      );

    if (containsNumericOrFactualClaim && segmentText.length >= 15) {
      extractedClaims.push({
        timestampSeconds: Math.floor(segment.start),
        rawText: segmentText,
        category: classifyClaimCategory(segmentText),
      });
    }
  }

  // If no claims matched the strict filter, promote the longest informative segments
  if (extractedClaims.length === 0 && transcriptSegments.length > 0) {
    const sortedSegments = [...transcriptSegments].sort(
      (firstSegment, secondSegment) => secondSegment.text.length - firstSegment.text.length,
    );

    const candidateSegment = sortedSegments[0];
    if (candidateSegment !== undefined) {
      extractedClaims.push({
        timestampSeconds: Math.floor(candidateSegment.start),
        rawText: candidateSegment.text,
        category: classifyClaimCategory(candidateSegment.text),
      });
    }
  }

  return extractedClaims;
};

export const extractClaimsFromTranscript = async (
  transcriptSegments: NormalizedTranscriptSegment[],
): Promise<ExtractedClaim[]> => {
  const apiKey = currentEnvironment.LLM_API_KEY;

  if (!apiKey || apiKey.trim().length === 0) {
    systemLogger.info(
      "LLM_API_KEY not configured. Utilizing heuristic claim extraction pipeline.",
    );
    return extractClaimsWithHeuristicFallback(transcriptSegments);
  }

  // Live LLM extraction call (e.g. OpenAI / Gemini format)
  try {
    const promptInstructions = `You are a factual claim extraction specialist. Extract discrete, checkable factual claims (health, financial, or general) from the following transcript segments. For each claim, output a JSON array with objects containing: timestampSeconds (number), rawText (string), and category ("health" | "financial" | "general").`;

    const segmentsSnippet = transcriptSegments
      .slice(0, 50)
      .map((seg) => `[${seg.start}s]: ${seg.text}`)
      .join("\n");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: promptInstructions },
          { role: "user", content: segmentsSnippet },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM provider HTTP error: ${response.status}`);
    }

    const responseData = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const contentText = responseData.choices?.[0]?.message?.content ?? "[]";
    const cleanedJsonText = contentText.replace(/```json\n?|\n?```/g, "").trim();
    const parsedClaims = JSON.parse(cleanedJsonText) as unknown[];

    const validatedClaims: ExtractedClaim[] = [];
    for (const rawClaimItem of parsedClaims) {
      const parseValidation = extractedClaimSchema.safeParse(rawClaimItem);
      if (parseValidation.success) {
        validatedClaims.push(parseValidation.data);
      }
    }

    if (validatedClaims.length > 0) {
      return validatedClaims;
    }
  } catch (llmCallError) {
    systemLogger.warn(
      "Live LLM claim extraction failed. Falling back to heuristic extractor.",
      {
        errorMessage:
          llmCallError instanceof Error ? llmCallError.message : String(llmCallError),
      },
    );
  }

  return extractClaimsWithHeuristicFallback(transcriptSegments);
};

export const evaluateGroundingSimilarity = async (
  claimText: string,
  evidenceSnippet: string,
): Promise<GroundingEvaluationResult> => {
  const normalizedClaim = claimText.toLowerCase();
  const normalizedSnippet = evidenceSnippet.toLowerCase();

  const claimWords = normalizedClaim.split(/\s+/).filter((word) => word.length > 3);
  const matchingWordCount = claimWords.filter((word) =>
    normalizedSnippet.includes(word),
  ).length;

  const overlapRatio =
    claimWords.length > 0 ? matchingWordCount / claimWords.length : 0.5;

  const isContradictory =
    /\b(false|disproven|no evidence|misleading|myth|debunked|contradicts|fake)\b/i.test(
      normalizedSnippet,
    );

  const calculatedSimilarity = Math.min(1.0, Math.max(0.1, Math.round(overlapRatio * 100) / 100));

  return {
    similarityScore: calculatedSimilarity,
    isContradictory,
    explanation: isContradictory
      ? "Evidence source contradicts or debunks the claim."
      : `Evidence overlaps with ${Math.round(calculatedSimilarity * 100)}% of the core claim concepts.`,
  };
};
