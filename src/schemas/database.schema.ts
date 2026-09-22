import {
  pgTable,
  uuid,
  text,
  integer,
  real,
  timestamp,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const claimCategoryEnum = pgEnum("claim_category", [
  "health",
  "financial",
  "general",
]);

export const claimStatusEnum = pgEnum("claim_status", [
  "pending",
  "resolved",
]);

export const sourceTypeEnum = pgEnum("source_type", [
  "fact_check_api",
  "serpapi_scholar",
  "serpapi_finance",
  "serpapi_search",
]);

export const confidenceLabelEnum = pgEnum("confidence_label", [
  "high_confidence",
  "contested",
  "unverified",
]);

export const videos = pgTable("videos", {
  id: uuid("id").primaryKey().defaultRandom(),
  youtubeUrl: text("youtube_url").notNull(),
  youtubeVideoId: text("youtube_video_id").notNull().unique(),
  title: text("title"),
  processedAt: timestamp("processed_at"),
});

export const claims = pgTable("claims", {
  id: uuid("id").primaryKey().defaultRandom(),
  videoId: uuid("video_id")
    .references(() => videos.id)
    .notNull(),
  timestampSeconds: integer("timestamp_seconds").notNull(),
  rawText: text("raw_text").notNull(),
  category: claimCategoryEnum("category").notNull(),
  status: claimStatusEnum("status").notNull().default("pending"),
});

export const evidence = pgTable("evidence", {
  id: uuid("id").primaryKey().defaultRandom(),
  claimId: uuid("claim_id")
    .references(() => claims.id)
    .notNull(),
  sourceType: sourceTypeEnum("source_type").notNull(),
  sourceUrl: text("source_url"),
  sourceDomain: text("source_domain"),
  sourceAuthorityScore: real("source_authority_score").notNull(),
  matchedText: text("matched_text"),
  groundingSimilarity: real("grounding_similarity").notNull(),
  rawResponseCachePath: text("raw_response_cache_path").notNull(),
});

export const verdicts = pgTable("verdicts", {
  id: uuid("id").primaryKey().defaultRandom(),
  claimId: uuid("claim_id")
    .references(() => claims.id)
    .notNull()
    .unique(),
  trustScore: real("trust_score").notNull(),
  confidenceLabel: confidenceLabelEnum("confidence_label").notNull(),
  verifiedClaimText: text("verified_claim_text"),
  conflictingClaims: jsonb("conflicting_claims").$type<string[]>(),
});

export type VideoRecord = InferSelectModel<typeof videos>;
export type InsertVideoRecord = InferInsertModel<typeof videos>;

export type ClaimRecord = InferSelectModel<typeof claims>;
export type InsertClaimRecord = InferInsertModel<typeof claims>;

export type EvidenceRecord = InferSelectModel<typeof evidence>;
export type InsertEvidenceRecord = InferInsertModel<typeof evidence>;

export type VerdictRecord = InferSelectModel<typeof verdicts>;
export type InsertVerdictRecord = InferInsertModel<typeof verdicts>;
