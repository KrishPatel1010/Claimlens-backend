import { eq } from "drizzle-orm";
import { getDatabaseClient } from "./database-client.js";
import {
  claims,
  evidence,
  verdicts,
  type ClaimRecord,
  type InsertClaimRecord,
  type EvidenceRecord,
  type InsertEvidenceRecord,
  type VerdictRecord,
  type InsertVerdictRecord,
} from "../schemas/database.schema.js";
import { systemLogger } from "../utils/logger.js";
import { randomUUID } from "node:crypto";

const inMemoryClaimStore = new Map<string, ClaimRecord>();
const inMemoryEvidenceStore = new Map<string, EvidenceRecord>();
const inMemoryVerdictStore = new Map<string, VerdictRecord>();

export interface FullClaimLedgerItem {
  claim: ClaimRecord;
  evidence: EvidenceRecord[];
  verdict: VerdictRecord | null;
}

export const createClaimRecord = async (
  insertClaimData: InsertClaimRecord,
): Promise<ClaimRecord> => {
  const databaseClient = getDatabaseClient();

  if (databaseClient !== null) {
    try {
      const insertedClaimRows = await databaseClient
        .insert(claims)
        .values(insertClaimData)
        .returning();

      const createdClaimRecord = insertedClaimRows[0];
      if (createdClaimRecord !== undefined) {
        inMemoryClaimStore.set(createdClaimRecord.id, createdClaimRecord);
        return createdClaimRecord;
      }
    } catch (databaseInsertError) {
      systemLogger.warn("Database insert failed for claim record. Using in-memory fallback.", {
        errorMessage: databaseInsertError instanceof Error ? databaseInsertError.message : String(databaseInsertError),
      });
    }
  }

  const generatedClaimId = insertClaimData.id ?? randomUUID();
  const fallbackClaimRecord: ClaimRecord = {
    id: generatedClaimId,
    videoId: insertClaimData.videoId,
    timestampSeconds: insertClaimData.timestampSeconds,
    rawText: insertClaimData.rawText,
    category: insertClaimData.category,
    status: insertClaimData.status ?? "pending",
  };

  inMemoryClaimStore.set(fallbackClaimRecord.id, fallbackClaimRecord);
  return fallbackClaimRecord;
};

export const findClaimsByVideoId = async (
  videoId: string,
): Promise<ClaimRecord[]> => {
  const databaseClient = getDatabaseClient();

  if (databaseClient !== null) {
    try {
      const queriedClaimRows = await databaseClient
        .select()
        .from(claims)
        .where(eq(claims.videoId, videoId));

      return queriedClaimRows;
    } catch (databaseQueryError) {
      systemLogger.warn(`Database query for claims with videoId '${videoId}' failed. Using in-memory fallback.`, {
        errorMessage: databaseQueryError instanceof Error ? databaseQueryError.message : String(databaseQueryError),
      });
    }
  }

  const matchingClaims: ClaimRecord[] = [];
  for (const storedClaim of inMemoryClaimStore.values()) {
    if (storedClaim.videoId === videoId) {
      matchingClaims.push(storedClaim);
    }
  }
  return matchingClaims;
};

export const createEvidenceRecord = async (
  insertEvidenceData: InsertEvidenceRecord,
): Promise<EvidenceRecord> => {
  const databaseClient = getDatabaseClient();

  if (databaseClient !== null) {
    try {
      const insertedEvidenceRows = await databaseClient
        .insert(evidence)
        .values(insertEvidenceData)
        .returning();

      const createdEvidenceRecord = insertedEvidenceRows[0];
      if (createdEvidenceRecord !== undefined) {
        inMemoryEvidenceStore.set(createdEvidenceRecord.id, createdEvidenceRecord);
        return createdEvidenceRecord;
      }
    } catch (databaseInsertError) {
      systemLogger.warn("Database insert failed for evidence record. Using in-memory fallback.", {
        errorMessage: databaseInsertError instanceof Error ? databaseInsertError.message : String(databaseInsertError),
      });
    }
  }

  const generatedEvidenceId = insertEvidenceData.id ?? randomUUID();
  const fallbackEvidenceRecord: EvidenceRecord = {
    id: generatedEvidenceId,
    claimId: insertEvidenceData.claimId,
    sourceType: insertEvidenceData.sourceType,
    sourceUrl: insertEvidenceData.sourceUrl ?? null,
    sourceDomain: insertEvidenceData.sourceDomain ?? null,
    sourceAuthorityScore: insertEvidenceData.sourceAuthorityScore,
    matchedText: insertEvidenceData.matchedText ?? null,
    groundingSimilarity: insertEvidenceData.groundingSimilarity,
    rawResponseCachePath: insertEvidenceData.rawResponseCachePath,
  };

  inMemoryEvidenceStore.set(fallbackEvidenceRecord.id, fallbackEvidenceRecord);
  return fallbackEvidenceRecord;
};

export const findEvidenceByClaimId = async (
  claimId: string,
): Promise<EvidenceRecord[]> => {
  const databaseClient = getDatabaseClient();

  if (databaseClient !== null) {
    try {
      const queriedEvidenceRows = await databaseClient
        .select()
        .from(evidence)
        .where(eq(evidence.claimId, claimId));

      return queriedEvidenceRows;
    } catch (databaseQueryError) {
      systemLogger.warn(`Database query for evidence with claimId '${claimId}' failed. Using in-memory fallback.`, {
        errorMessage: databaseQueryError instanceof Error ? databaseQueryError.message : String(databaseQueryError),
      });
    }
  }

  const matchingEvidence: EvidenceRecord[] = [];
  for (const storedEvidence of inMemoryEvidenceStore.values()) {
    if (storedEvidence.claimId === claimId) {
      matchingEvidence.push(storedEvidence);
    }
  }
  return matchingEvidence;
};

export const createVerdictRecord = async (
  insertVerdictData: InsertVerdictRecord,
): Promise<VerdictRecord> => {
  const databaseClient = getDatabaseClient();

  if (databaseClient !== null) {
    try {
      const insertedVerdictRows = await databaseClient
        .insert(verdicts)
        .values(insertVerdictData)
        .returning();

      const createdVerdictRecord = insertedVerdictRows[0];
      if (createdVerdictRecord !== undefined) {
        inMemoryVerdictStore.set(createdVerdictRecord.claimId, createdVerdictRecord);
        return createdVerdictRecord;
      }
    } catch (databaseInsertError) {
      systemLogger.warn("Database insert failed for verdict record. Using in-memory fallback.", {
        errorMessage: databaseInsertError instanceof Error ? databaseInsertError.message : String(databaseInsertError),
      });
    }
  }

  const generatedVerdictId = insertVerdictData.id ?? randomUUID();
  const fallbackVerdictRecord: VerdictRecord = {
    id: generatedVerdictId,
    claimId: insertVerdictData.claimId,
    trustScore: insertVerdictData.trustScore,
    confidenceLabel: insertVerdictData.confidenceLabel,
    verifiedClaimText: insertVerdictData.verifiedClaimText ?? null,
    conflictingClaims: insertVerdictData.conflictingClaims ?? null,
  };

  inMemoryVerdictStore.set(fallbackVerdictRecord.claimId, fallbackVerdictRecord);
  return fallbackVerdictRecord;
};

export const findVerdictByClaimId = async (
  claimId: string,
): Promise<VerdictRecord | null> => {
  const databaseClient = getDatabaseClient();

  if (databaseClient !== null) {
    try {
      const queriedVerdictRows = await databaseClient
        .select()
        .from(verdicts)
        .where(eq(verdicts.claimId, claimId))
        .limit(1);

      return queriedVerdictRows[0] ?? null;
    } catch (databaseQueryError) {
      systemLogger.warn(`Database query for verdict with claimId '${claimId}' failed. Using in-memory fallback.`, {
        errorMessage: databaseQueryError instanceof Error ? databaseQueryError.message : String(databaseQueryError),
      });
    }
  }

  return inMemoryVerdictStore.get(claimId) ?? null;
};

export const findFullClaimLedgerByVideoId = async (
  videoId: string,
): Promise<FullClaimLedgerItem[]> => {
  const videoClaims = await findClaimsByVideoId(videoId);

  const ledgerItems: FullClaimLedgerItem[] = [];

  for (const singleClaim of videoClaims) {
    const claimEvidence = await findEvidenceByClaimId(singleClaim.id);
    const claimVerdict = await findVerdictByClaimId(singleClaim.id);

    ledgerItems.push({
      claim: singleClaim,
      evidence: claimEvidence,
      verdict: claimVerdict,
    });
  }

  return ledgerItems;
};

export const clearInMemoryClaimStores = (): void => {
  inMemoryClaimStore.clear();
  inMemoryEvidenceStore.clear();
  inMemoryVerdictStore.clear();
};
