# Phase 3 Walkthrough: Claim Extraction, Grounding & Verification Pipeline (Stages 2–7)

Completed the end-to-end 7-Stage Claim Verification Pipeline: from YouTube video URL ingestion to transcript extraction, LLM-driven claim extraction with timestamps, category classification, Google Fact Check lookup, SerpApi multi-engine grounding fallback, mathematical trust scoring, and 4-tier write-through persistence.

---

## Key Modules Implemented

### 1. Domain Scoring Engine
- [`src/domain/scoring/scoring-calculator.ts`](file:///c:/Users/krish/Claimlens/backend/src/domain/scoring/scoring-calculator.ts): Pure functions calculating domain authority scores (`1.0` for Fact Check, Scholar, Finance, government, and educational domains; `0.7` for news; `0.4` for web; `0.1` for none), Trust Score ($\text{Trust Score} = \text{Grounding Score} \times \text{Source Authority Score}$), and Confidence Labels (`high_confidence`, `contested`, `unverified`).

### 2. Multi-Provider External Clients
- [`src/clients/llm/llm-client.ts`](file:///c:/Users/krish/Claimlens/backend/src/clients/llm/llm-client.ts): Structured extraction of discrete, checkable claims with exact `timestampSeconds` from transcript segments, and semantic grounding similarity grading.
- [`src/clients/google-fact-check/fact-check-client.ts`](file:///c:/Users/krish/Claimlens/backend/src/clients/google-fact-check/fact-check-client.ts): Queries `claims:search` on Google Fact Check Tools API ($0 cost), parsing reviews, ratings, and publishers.
- [`src/clients/serpapi/serpapi-grounding-client.ts`](file:///c:/Users/krish/Claimlens/backend/src/clients/serpapi/serpapi-grounding-client.ts): Category-aware fallback routing (`google_scholar` for health, `google_finance` for financial, `google` for general).

### 3. Pipeline Stages & Orchestrator
- [`src/pipeline/stages/stage-2-claim-extraction.ts`](file:///c:/Users/krish/Claimlens/backend/src/pipeline/stages/stage-2-claim-extraction.ts): Stage 2 discrete claim extraction.
- [`src/pipeline/stages/stage-3-claim-classification.ts`](file:///c:/Users/krish/Claimlens/backend/src/pipeline/stages/stage-3-claim-classification.ts): Stage 3 category classification and SHA-256 deduplication hashing.
- [`src/pipeline/stages/stage-4-fact-check.ts`](file:///c:/Users/krish/Claimlens/backend/src/pipeline/stages/stage-4-fact-check.ts): Stage 4 Fact Check search and raw disk evidence caching.
- [`src/pipeline/stages/stage-5-serpapi-grounding.ts`](file:///c:/Users/krish/Claimlens/backend/src/pipeline/stages/stage-5-serpapi-grounding.ts): Stage 5 SerpApi grounding fallback.
- [`src/pipeline/stages/stage-6-scoring.ts`](file:///c:/Users/krish/Claimlens/backend/src/pipeline/stages/stage-6-scoring.ts): Stage 6 scoring evaluation.
- [`src/pipeline/stages/stage-7-ledger.ts`](file:///c:/Users/krish/Claimlens/backend/src/pipeline/stages/stage-7-ledger.ts): Stage 7 write-through persistence and Redis hot cache storage.
- [`src/pipeline/pipeline-orchestrator.ts`](file:///c:/Users/krish/Claimlens/backend/src/pipeline/pipeline-orchestrator.ts): Coordinates the full 7 stages end-to-end.

### 4. Persistence Repositories & API Controller
- [`src/repositories/claim-repository.ts`](file:///c:/Users/krish/Claimlens/backend/src/repositories/claim-repository.ts): Relational operations for `claims`, `evidence`, and `verdicts` tables with in-memory test fallback.
- [`src/controllers/video-controller.ts`](file:///c:/Users/krish/Claimlens/backend/src/controllers/video-controller.ts): Upgraded `POST /api/videos/process` returning the complete timestamped claim ledger, and `GET /api/videos/:videoId` returning full ledger details.

---

## Verification Results

### Automated Vitest Suite (12 Test Files / 44 Tests Passing)
```text
 ✓ src/utils/youtube-url-parser.test.ts (7 tests)
 ✓ src/cache/claim-hasher.test.ts (3 tests)
 ✓ src/cache/disk-cache-manager.test.ts (3 tests)
 ✓ src/repositories/video-repository.test.ts (3 tests)
 ✓ src/repositories/claim-repository.test.ts (3 tests)
 ✓ src/domain/scoring/scoring-calculator.test.ts (11 tests)
 ✓ src/clients/llm/llm-client.test.ts (3 tests)
 ✓ src/clients/google-fact-check/fact-check-client.test.ts (1 test)
 ✓ src/pipeline/stages/stage-1-transcript.test.ts (1 test)
 ✓ src/pipeline/pipeline-orchestrator.test.ts (1 test)
 ✓ src/controllers/video-controller.test.ts (5 tests)
 ✓ src/app.test.ts (3 tests)

Test Files  12 passed (12)
     Tests  44 passed (44)
  Duration  13.17s
```

### TypeScript Strict Compilation Check
```bash
npm run typecheck
# tsc --noEmit: Exited with code 0 (0 errors)
```
