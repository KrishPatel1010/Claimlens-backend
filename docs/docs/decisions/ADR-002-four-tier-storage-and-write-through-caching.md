# ADR-002: Four-Tier Storage Architecture & Write-Through Caching

## Status
Accepted

## Context
ClaimLens is developed under the constraints of the SerpApi India Hackathon 2026:
1. Total free-tier credit budget is capped at **250 credits**. Uncontrolled calls would rapidly exhaust the quota during testing or demo recording.
2. Hackathon judging criteria require "meaningful SerpApi usage" that must be directly verifiable by judges inspecting the repository.
3. The demo dataset must run smoothly without requiring live network calls during evaluation.

## Decision
We established a strict **Four-Tier Storage Architecture** with four distinct responsibilities:
1. **Redis Hot Cache:** Ephemeral key-value cache keyed by normalized claim hash (`claim:{claimHash}`) and video ID (`video:{youtubeVideoId}`). Provides instant deduplication: if two videos make the same claim, SerpApi is called only once.
2. **Supabase (PostgreSQL) via Drizzle ORM:** The structured source of truth (`videos`, `claims`, `evidence`, `verdicts`). Powers application queries and UI rendering.
3. **Repository Disk Cache (`/data/cache/*.json`):** Committed flat JSON files containing verbatim, unedited external API responses for every lookup. This provides permanent proof for judges to inspect without running the database.
4. **External APIs (SerpApi & Google Fact Check Tools API):** Executed strictly on cache misses.

### Mandatory Write-Through Order:
```text
1. Check Redis (Hot cache)        → Hit? Return 0 credit.
2. Check Supabase (Structured DB)  → Hit? Return 0 credit.
3. Call External API               → Only on miss across both.
4. Write Raw Response to Disk      → /data/cache/{claimId}_{sourceType}.json
5. Insert Relational Rows          → Supabase (evidence row links to disk path)
6. Write to Redis                  → Keyed by normalized claim hash
```

## Alternatives Considered
* **Database-Only Caching:**
  * *Cons:* Evaluators cannot inspect raw API responses without spinning up the database or migrations. Does not protect against repeated development test runs if database state is wiped.
* **Pure Filesystem Caching:**
  * *Cons:* Inefficient for complex client-side queries, filtering by category, or relational queries across claims and verdicts.

## Consequences
### Positive
* Strict preservation of the 250 SerpApi credit budget.
* Re-running known videos costs zero API credits.
* Directly satisfies hackathon evaluation criteria by providing transparent, inspectable evidence files in Git.
* Redis can be flushed at any time without data loss; Supabase and disk remain the immutable truth.

### Negative / Trade-offs
* Multi-destination writes must be orchestrated cleanly to prevent partial failures. Handled via a centralized `WriteThroughCacheManager`.

## Date
2026-09-19
