# ClaimLens Backend

Express REST API for ClaimLens — an automated YouTube claim verification pipeline built for the SerpApi India Hackathon 2026.

## Verification Pipeline
1. **Stage 1 — Transcript Fetching:** SerpApi `youtube_video_transcript` engine.
2. **Stage 2 — Claim Extraction:** LLM discrete, checkable claim extraction with timestamps.
3. **Stage 3 — Claim Classification:** Health / Financial / General categories.
4. **Stage 4 — Fact Check Lookup:** Google Fact Check Tools API (`claims:search`).
5. **Stage 5 — SerpApi Grounding Fallback:** `google_scholar` (Health), `google_finance` (Financial), `google` (General).
6. **Stage 6 — Scoring Algorithm:** $\text{Trust Score} = \text{Grounding Score} \times \text{Source Authority Score}$.
7. **Stage 7 — Output Ledger:** Structured claim ledger with evidence references.

## Getting Started

### Prerequisites
- Node.js >= 20
- Redis (optional for local fallback)
- Supabase PostgreSQL

### Installation
```bash
npm install
```

### Environment Variables
Copy `.env.example` to `.env` and configure your API keys:
```bash
cp .env.example .env
```

### Development
```bash
npm run dev
```

### Testing
```bash
npm test
```
