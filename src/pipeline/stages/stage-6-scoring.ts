import {
  calculateSourceAuthorityScore,
  calculateTrustScore,
  determineConfidenceLabel,
  type SourceType,
  type ConfidenceLabel,
} from "../../domain/scoring/scoring-calculator.js";
import { evaluateGroundingSimilarity } from "../../clients/llm/llm-client.js";
import { systemLogger } from "../../utils/logger.js";

export interface Stage6ScoringInput {
  claimId: string;
  claimText: string;
  sourceType: SourceType | null;
  sourceDomain: string | null;
  matchedText: string | null;
}

export interface Stage6ScoringResult {
  claimId: string;
  sourceAuthorityScore: number;
  groundingSimilarity: number;
  trustScore: number;
  confidenceLabel: ConfidenceLabel;
  verifiedClaimText: string;
  conflictingClaims: string[];
}

export const executeStage6Scoring = async (
  scoringInput: Stage6ScoringInput,
): Promise<Stage6ScoringResult> => {
  const { claimId, claimText, sourceType, sourceDomain, matchedText } = scoringInput;

  systemLogger.info(`Stage 6: Scoring claim '${claimId}'.`);

  let sourceAuthorityScore = 0.1;
  let groundingSimilarity = 0.1;
  let isContradictory = false;

  if (sourceType !== null && matchedText !== null) {
    sourceAuthorityScore = calculateSourceAuthorityScore(sourceType, sourceDomain);

    const groundingEval = await evaluateGroundingSimilarity(claimText, matchedText);
    groundingSimilarity = groundingEval.similarityScore;
    isContradictory = groundingEval.isContradictory;
  }

  const trustScore = calculateTrustScore(groundingSimilarity, sourceAuthorityScore);
  const confidenceLabel = determineConfidenceLabel(trustScore, isContradictory);

  const conflictingClaims: string[] = [];
  if (isContradictory && matchedText !== null) {
    conflictingClaims.push(matchedText);
  }

  return {
    claimId,
    sourceAuthorityScore,
    groundingSimilarity,
    trustScore,
    confidenceLabel,
    verifiedClaimText: claimText,
    conflictingClaims,
  };
};
