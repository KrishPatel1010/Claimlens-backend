# Phase 2 Implementation Plan: Data Storage Architecture, 4-Tier Caching & Stage 1 Transcript Fetching

Implement the core data persistence models, 4-tier storage write-through sequence, and Stage 1 transcript extraction engine to begin processing YouTube videos while safeguarding the 250-credit SerpApi monthly budget.

## Core Rules & Guardrails
- **SerpApi Quota Preservation:** Every external API call follows the mandatory 4-tier write-through sequence: Redis Hot Cache $\rightarrow$ Supabase PostgreSQL $\rightarrow$ External API $\rightarrow$ Disk `/data/cache/*.json` proof $\rightarrow$ Write-through back to Supabase & Redis.
- **Graceful Degradation:** When running in local development without active Redis or remote Supabase credentials, the pipeline gracefully falls back to local disk and in-memory caches rather than throwing unhandled connection exceptions.
- **Branching Strategy:** Work is developed on `feat/storage-and-transcript-pipeline` and merged into `staging`.

---

## 4-Tier Sequence Architecture

```
Client / Next.js
       │
       ▼
POST /api/videos/process { youtubeUrl }
       │
       ▼
[URL Validator & SSRF Guard] ──► Extracts 11-char YouTube ID
       │
       ▼
[4-Tier Cache Manager]
  ├── 1. Redis Cache (video:{videoId})
  └── 2. Supabase DB (videos table)
       │ (on cache miss)
       ▼
[Stage 1: SerpApi Transcript Fetcher] (youtube_video_transcript)
       │
       ▼
[Disk Evidence Store] ──► Writes /data/cache/{videoId}_transcript.json
       │
       ▼
[Drizzle ORM Repository] ──► Persists video row (status: pending)
       │
       ▼
Response: { videoId, title, segments, cached: boolean }
```

---

## Components Delivered

1. **Database & Persistence Layer**:
   - `src/schemas/database.schema.ts`: Drizzle ORM definitions for `videos`, `claims`, `evidence`, `verdicts`.
   - `src/repositories/database-client.ts`: PostgreSQL pooling via `postgres` with graceful in-memory fallback.
   - `src/repositories/video-repository.ts`: Video querying, insertion, and status updates.

2. **Caching & Disk Evidence Layer**:
   - `src/cache/claim-hasher.ts`: Pure normalization and SHA-256 deduplication hashing.
   - `src/cache/redis-client.ts`: Resilient Redis client with offline fallback.
   - `src/cache/disk-cache-manager.ts`: Writes/reads raw payloads to `data/cache/*.json`.
   - `src/cache/cache-manager.ts`: 4-tier cache coordinator.

3. **Stage 1 Transcript Fetching**:
   - `src/utils/youtube-url-parser.ts`: SSRF guard and 11-char ID extraction.
   - `src/clients/serpapi/serpapi-client.ts`: Typed SerpApi transcript client.
   - `src/pipeline/stages/stage-1-transcript.ts`: Stage 1 execution and write-through cache.

4. **API Endpoints**:
   - `src/schemas/video-requests.schema.ts`: Zod request validator.
   - `src/controllers/video-controller.ts`: Video ingestion handler.
   - `src/routes/video-routes.ts`: `/api/videos` router.
