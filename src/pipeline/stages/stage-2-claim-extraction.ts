import {
  extractClaimsFromTranscript,
  type ExtractedClaim,
} from "../../clients/llm/llm-client.js";
import type { NormalizedTranscriptSegment } from "../../clients/serpapi/serpapi-client.js";
import { systemLogger } from "../../utils/logger.js";

export const executeStage2ClaimExtraction = async (
  transcriptSegments: NormalizedTranscriptSegment[],
): Promise<ExtractedClaim[]> => {
  systemLogger.info(
    `Executing Stage 2 Claim Extraction across ${transcriptSegments.length} transcript segments.`,
  );

  const extractedClaims = await extractClaimsFromTranscript(transcriptSegments);

  systemLogger.info(`Stage 2 complete: Extracted ${extractedClaims.length} discrete claims.`);
  return extractedClaims;
};
