# ClaimLens — Visual Architecture Documentation

This directory houses the canonical, version-controlled architecture diagrams for ClaimLens in Mermaid (`.mmd`) format.

Architecture documentation must evolve together with the codebase. When modifying any core boundary, pipeline stage, or data model, follow the **Architecture Synchronization Rule** to update the corresponding `.mmd` diagram.

---

## Architecture Index

### 1. System Context (C4 Level 1)
* **File:** [`01-system-context.mmd`](./01-system-context.mmd)
* **Scope:** Defines the ClaimLens system boundary, user personas (Viewers, Researchers, Judges), and external integrations (YouTube, SerpApi Transcript & Grounding, Google Fact Check Tools API, and LLM Provider).

### 2. Container Architecture (C4 Level 2)
* **File:** [`02-container-architecture.mmd`](./02-container-architecture.mmd)
* **Scope:** Illustrates the runtime containers: Next.js Frontend (`frontend/`), Express REST API (`backend/`), and the 4-Tier Storage Layer (Redis hot cache, Supabase PostgreSQL, `/data/cache/*.json` repo disk cache, and external APIs).

### 3. Component Architecture (C4 Level 3)
* **File:** [`03-component-architecture.mmd`](./03-component-architecture.mmd)
* **Scope:** Details the internal components of the Express backend: HTTP routes & controllers, the 7-stage verification pipeline orchestrator, external client adapters, and persistence repositories.

### 4. End-to-End Data Flow
* **File:** [`04-data-flow.mmd`](./04-data-flow.mmd)
* **Scope:** Sequences the complete journey from user URL submission to transcript extraction, claim decomposition, write-through cache checking, grounding, scoring, and verdict delivery.

### 5. Authentication Flow
* **File:** [`05-authentication-flow.mmd`](./05-authentication-flow.mmd)
* **Scope:** Documents the confirmed **Anonymous Public Access (v1)** model with rate-limiting & CORS protection, and marks future authentication extensions as **TBD / Deferred**.

### 6. Database Schema & ERD
* **File:** [`06-database-erd.mmd`](./06-database-erd.mmd)
* **Scope:** Entity-Relationship diagram representing the relational models: `videos`, `claims`, `evidence`, and `verdicts` managed via Drizzle ORM on Supabase (PostgreSQL).

### 7. API / Data Interaction Flow
* **File:** [`07-api-flow.mmd`](./07-api-flow.mmd)
* **Scope:** Sequence diagrams for primary REST endpoints (`POST /api/videos/process`, `GET /api/videos/:id/claims`, `GET /api/claims/:id/evidence`) and error scenarios.

### 8. Deployment Architecture
* **File:** [`08-deployment-architecture.mmd`](./08-deployment-architecture.mmd)
* **Scope:** Topology diagram mapping local development, GitHub public repository with inspectable evidence files, hosting runtime, cloud data infrastructure, and external API providers.

---

## Architectural Principles

1. **No Invented Architecture:** Never invent components, queues, or services before they are required. Unconfirmed items are explicitly marked `TBD`.
2. **Deterministic Mermaid:** All diagrams are plain text, human-readable, and commit-tracked.
3. **Credit Protection:** The architecture strictly enforces a 4-tier write-through cache order (Redis → Supabase → Disk → API) to stay safely within the 250 SerpApi free-tier credit budget.
4. **Judge Reviewability:** Raw external API responses are committed to `/data/cache/` so evaluators can inspect raw evidence trails directly from the repository.
