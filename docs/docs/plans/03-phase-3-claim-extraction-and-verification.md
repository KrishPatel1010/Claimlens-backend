# Phase 3 Implementation Plan: Claim Extraction, Grounding & Verification Pipeline (Stages 2–7)

Build the full end-to-end verification pipeline from transcript segments to final timestamped claim ledger, implementing LLM claim extraction, Google Fact Check search, SerpApi multi-engine grounding (Scholar, Finance, Search), mathematical trust scoring, and 4-tier write-through persistence.

## Core Rules & Guardrails
- **Budget Preservation:** In Stage 4, Google Fact Check Tools API ($0 cost) is always queried first. Live SerpApi grounding calls (Stage 5) are ONLY invoked if Fact Check has zero matches AND the claim has not been previously cached in Redis or Supabase.
- **Deterministic Scorer:** The mathematical scoring engine ($\text{Trust Score} = \text{Grounding Score} \times \text{Source Authority Score}$) is implemented as pure, zero-side-effect domain functions with 100% test coverage.
- **Offline Resilience:** All external API clients (LLM, Google Fact Check, SerpApi Scholar/Finance) include automatic offline mock fallbacks when API keys are unconfigured, enabling smooth test runs and local evaluations.

---

## 7-Stage Pipeline Sequence

```
[Stage 1: Transcript] (Completed in Phase 2)
         │
         ▼
[Stage 2: Claim Extraction] ──► LLM prompt extracts discrete claims + timestamp_seconds
         │
         ▼
[Stage 3: Classification]   ──► Assigns category (health | financial | general) + SHA-256 hash
         │
         ▼
   Check Redis / DB by claim hash
      ├── Hit ──► Use cached verdict (0 API credits)
      └── Miss ─► Continue pipeline
                  │
                  ▼
[Stage 4: Google Fact Check API] ──► claims:search ($0 cost)
      ├── Found Match ─────────────► Write /data/cache/{claimId}_fact_check.json (Auth = 1.0)
      └── No Match ────────────────► Continue to Stage 5
                                     │
                                     ▼
[Stage 5: SerpApi Grounding Fallback]
      ├── Health    ──► google_scholar (Auth = 1.0)
      ├── Financial ──► google_finance (Auth = 1.0)
      └── General   ──► google (Auth = 0.7 or 0.4)
            │
            ▼
      Write /data/cache/{claimId}_{sourceType}.json
            │
            ▼
[Stage 6: Scoring Algorithm]
      ├── Evaluate Grounding Similarity (0.0 – 1.0)
      ├── Trust Score = Grounding Score × Source Authority Score
      └── Assign Confidence Label (high_confidence | contested | unverified)
            │
            ▼
[Stage 7: Output Ledger & Persistence]
      ├── Insert records: claims, evidence, verdicts
      ├── Cache verdict in Redis hot cache
      └── Return timestamp-synchronized ledger response
```

---

## Components Planned

1. **Domain Scoring Engine**:
   - `src/domain/scoring/scoring-calculator.ts`: Trust Score, Authority Score, Confidence Label calculation.
2. **External Clients**:
   - `src/clients/llm/llm-client.ts`: Structured claim extraction & similarity grading.
   - `src/clients/google-fact-check/fact-check-client.ts`: Fact check query lookup.
   - `src/clients/serpapi/serpapi-grounding-client.ts`: Multi-engine grounding client.
3. **Pipeline Stages**:
   - `src/pipeline/stages/stage-2-claim-extraction.ts`
   - `src/pipeline/stages/stage-3-claim-classification.ts`
   - `src/pipeline/stages/stage-4-fact-check.ts`
   - `src/pipeline/stages/stage-5-serpapi-grounding.ts`
   - `src/pipeline/stages/stage-6-scoring.ts`
   - `src/pipeline/stages/stage-7-ledger.ts`
   - `src/pipeline/pipeline-orchestrator.ts`
4. **Repositories**:
   - `src/repositories/claim-repository.ts`: Claims, evidence, and verdicts persistence.
5. **Controller Integration**:
   - Upgrading `src/controllers/video-controller.ts` to return full verified ledger.
