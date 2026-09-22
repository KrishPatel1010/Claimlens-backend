# ClaimLens — AI Agent Operating Contract (`AGENTS.md`)

> **Authoritative Instruction:** All AI coding agents operating inside this repository must strictly adhere to this file and [`rules.md`](./rules.md). Do not violate these rules under any circumstances.

---

## 1. Project Architecture Overview

ClaimLens is a production-oriented YouTube claim verification application built for the **SerpApi India Hackathon 2026 (Track: Knowledge & Public Interest)**.

It takes a YouTube video URL and produces a timestamped, evidence-backed verdict on every factual health or financial claim made in the video.

### 7-Stage Verification Pipeline
1. **Stage 1 — Transcript Fetching:** SerpApi `youtube_video_transcript` engine.
2. **Stage 2 — Claim Extraction:** LLM-driven discrete, checkable claim extraction with timestamps.
3. **Stage 3 — Claim Classification:** Health / Financial / General categories.
4. **Stage 4 — Fact Check Lookup:** Google Fact Check Tools API (`claims:search`) primary query.
5. **Stage 5 — SerpApi Grounding Fallback:** `google_scholar` (Health), `google_finance` (Financial), `google` (General).
6. **Stage 6 — Scoring Algorithm:** $\text{Trust Score} = \text{Grounding Score} \times \text{Source Authority Score}$.
7. **Stage 7 — Output Ledger:** Timestamp-synchronized claim ledger rendered in Next.js.

### 4-Tier Storage & Write-Through Rule
To safeguard the **250-credit SerpApi monthly budget** and guarantee hackathon judge inspectability:
```text
1. Check Redis Hot Cache (dedup by normalized claim hash) → 0 credit
2. Check Supabase PostgreSQL (structured records)         → 0 credit
3. Execute External API (SerpApi / Fact Check API)       → Cache miss only
4. Write Raw Response to Disk                             → /data/cache/{claimId}_{sourceType}.json
5. Persist Relational Rows to Supabase (Drizzle ORM)     → Evidence points to disk path
6. Cache in Redis                                        → Keyed by normalized claim hash
```

---

## 2. Directory Responsibilities

| Directory | Responsibility | Boundaries |
|---|---|---|
| `frontend/` | Next.js Frontend Application | UI components, video player, claim ledger, client hooks. No direct DB access. |
| `backend/` | Express REST API Application | Pipeline stages 1–7, scoring, write-through caching, external adapters, routes. |
| `data/cache/` | Raw External API Evidence Cache | Flat JSON files of raw provider responses committed to Git for hackathon judges. |
| `data/demo-videos.json` | Curated Demo Dataset | List of pre-screened demo videos with known claims. |
| `docs/architecture/` | Visual Architecture Documentation | Plain text Mermaid `.mmd` diagrams (C4 models, data flow, ERD). |
| `docs/decisions/` | Architecture Decision Records | Formal ADRs tracking technical trade-offs. |
| `docs/development/` | Developer Guidelines | Setup, conventions, workflow instructions. |

---

## 3. Mandatory Modern JavaScript & Arrow Function Syntax

* **PROHIBITED:** Legacy `function` declarations:
  ```ts
  // BAD: Do not use
  function calculateTrustScore(...) { ... }
  async function processVideo(...) { ... }
  ```
* **MANDATORY:** Modern arrow functions assigned to constants:
  ```ts
  // GOOD: Always use arrow functions
  export const calculateTrustScore = (
    groundingSimilarityScore: number,
    sourceAuthorityScore: number,
  ): number => {
    return groundingSimilarityScore * sourceAuthorityScore;
  };

  export const processVideo = async (
    videoProcessingInput: ProcessVideoInput,
  ): Promise<ProcessVideoResult> => { ... };
  ```
* Applies across: utilities, services, controllers, middlewares, React components (`export const ClaimLedger = (...) => { ... }`), and custom hooks.

---

## 4. Domain-Driven Naming Conventions

* **No single-letter variables:** Variables like `a`, `b`, `c`, `x`, `y`, `i`, `v`, `e` are strictly banned.
* **No generic/dummy names:** `abc`, `foo`, `bar`, `data`, `res`, `req`, `item`, `val`, `temp`, `stuff`.
* **Array Callbacks & Higher-Order Functions (`.map`, `.filter`, `.reduce`, `.find`, `.some`):**
  The iterator parameter MUST be the explicit, singular domain name of the items in the collection:
  ```ts
  // BAD:
  claims.map((c) => c.score);
  evidence.filter((e) => e.score > 0.7);

  // GOOD:
  verifiedClaims.map((verifiedClaim) => verifiedClaim.trustScore);
  evidenceList.filter((evidenceItem) => evidenceItem.sourceAuthorityScore >= 0.7);
  ```

---

## 5. Coding & Type Conventions

* **Zero `any` Policy:** `any`, `Array<any>`, `Promise<any>`, `Record<string, any>`, `as any` are strictly prohibited.
* **Narrowing:** Use `unknown` and narrow with Zod schemas or discriminated unions.
* **Strict TypeScript:** `noImplicitAny`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` are required.
* **File Casing:** All files and directories must be `kebab-case` (e.g., `calculate-trust-score.ts`).
* **Component Casing:** React components must be `PascalCase` (e.g., `ClaimLedger.tsx`).

---

## 6. Component Conventions

* React components must be thin presentation units.
* Pages handle route composition and data passing; no direct database queries or raw scoring calculations.
* Do not add `"use client";` unnecessarily. Keep client boundaries small and localized.

---

## 7. API Conventions

* Controllers extract request parameters, validate via Zod, invoke application services, and return typed responses.
* Routes never contain business logic.
* Use correct HTTP status codes (`200`, `201`, `400`, `404`, `422`, `429`, `500`).
* Response errors must use structured codes: `{ error: { code: "ERROR_CODE", message: "Human message" } }`.

---

## 8. Database Conventions

* Drizzle ORM manages Supabase PostgreSQL models.
* Relational models: `videos`, `claims`, `evidence`, `verdicts`.
* Database queries are restricted to repositories; components and controllers never query the database directly.
* Schema changes must have a corresponding migration, ERD update, and type update.

---

## 9. Error-Handling & Logging Conventions

* Centralized typed errors (`AppError`).
* Never use empty catch blocks or blind `console.log(caughtError)`.
* Never leak API keys, access tokens, or internal database stack traces to clients.

---

## 10. Testing Conventions

* Every business rule must be testable (pure functions for scoring, normalization, and hashing).
* Priority test targets: claim normalization, claim hashing, scoring formula, cache fallback sequence, and Zod input validators.

---

## 11. Architecture Diagram Rules

* Diagrams are stored in `docs/architecture/*.mmd` using Mermaid format.
* Inspect the actual codebase before updating diagrams; never regenerate from memory.
* Never modify code merely to make a diagram simpler.
* Diagrams are documentation, not executable code. Inconsistencies must be resolved transparently.

---

## 12. Architecture Decision Records (ADR) Rules

* Create an ADR in `docs/decisions/` whenever introducing a major architectural, infrastructure, or library decision.
* Follow the standard lifecycle: `Proposed` → `Accepted` → `Superseded` → `Rejected`.

---

## 13. Security Rules

* Validate all external inputs (YouTube URLs, query params, HTTP bodies, LLM outputs).
* Prevent SSRF and validate YouTube URL regex patterns.
* Rate limit public endpoints to protect the SerpApi credit quota.
* Anonymous public access is confirmed for v1; do NOT invent authentication.

---

## 14. Git & Commit Conventions

Use conventional commit messages: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`.
Never use vague commit messages (`stuff`, `changes`, `update`).

---

## 15. Rules for Modifying Existing Architecture

When any change affects architecture (adding tables, services, external APIs, pipeline stages):
1. Evaluate impact on the 8 `.mmd` diagrams in `docs/architecture/`.
2. Update affected diagrams.
3. Create an ADR if the choice is architecturally significant.
4. Update `CHANGELOG.md`.
5. Verify that the 250-credit SerpApi budget is preserved.
