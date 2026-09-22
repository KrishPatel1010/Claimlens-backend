# ADR-001: Next.js Frontend + Express REST API Monorepo

## Status
Accepted

## Context
ClaimLens requires:
1. An interactive, responsive web user interface that renders a YouTube video player synchronized with an evidence-backed, timestamped claim ledger.
2. A robust, multi-stage backend pipeline (Stages 1 through 7) that fetches transcripts via SerpApi, coordinates LLM claim extraction and classification, queries Google Fact Check Tools API, grounds evidence via SerpApi engines (Scholar, Finance, Search), scores veracity, and handles a write-through caching system.
3. Clean separation of concerns between client-side presentation and backend pipeline orchestration.

## Decision
We chose a TypeScript modular architecture split into:
* `frontend/`: Next.js (App Router, React, TypeScript) for presentation, layout, and client-side media synchronization.
* `backend/`: Express.js REST API (Node.js, TypeScript) for the 7-stage verification pipeline, credit management, and data access.
* Supabase (PostgreSQL) managed database with Drizzle ORM for structured relational storage.

## Alternatives Considered
* **Pure Next.js Fullstack (Server Actions / Route Handlers):**
  * *Pros:* Single package, zero separate API server deployment.
  * *Cons:* Coupling the 60-second multi-stage pipeline and heavy external I/O directly into Next.js serverless functions risks request timeouts (10s/15s limits on free-tier serverless), makes background task streaming more cumbersome, and complicates standalone CLI/pipeline testing.
* **FastAPI (Python):**
  * *Pros:* Native ecosystem for AI/ML pipelines.
  * *Cons:* Requires polyglot repository management (Python + TS/React), increases context-switching overhead, and duplicates schema types between backend and frontend.

## Consequences
### Positive
* Type sharing across `frontend/` and `backend/` using clean domain models.
* The Express backend can execute long-running verification pipelines without serverless execution timeouts.
* Clear architectural boundary: the frontend consumes typed REST endpoints and cannot bypass pipeline rules or directly query databases.

### Negative / Trade-offs
* Two runtime processes must be orchestrated locally during development (e.g., port 3000 for web and port 4000 for API).

## Date
2026-09-19
