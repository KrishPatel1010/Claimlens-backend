# ClaimLens — Development Environment Setup

This guide walks through setting up ClaimLens locally for development, testing, and evaluation.

---

## 1. Prerequisites

* **Node.js:** v20.x or later (LTS recommended)
* **Package Manager:** `npm` (v10+) or `pnpm`
* **Redis:** Local Redis instance (via Docker or native) or Redis Cloud URL
* **PostgreSQL / Supabase:** Supabase project or local PostgreSQL 15+ database

---

## 2. Clone and Install Dependencies

```bash
git clone https://github.com/krish/Claimlens.git
cd Claimlens
npm install
```

---

## 3. Environment Variables Configuration

Copy `.env.example` to `.env` in the root (and in `backend/.env` if running processes independently):

```bash
cp .env.example .env
```

### Required Configuration Matrix

| Variable | Required For | Description |
|---|---|---|
| `SERPAPI_KEY` | Pipeline Stages 1, 5 | SerpApi API key for YouTube transcripts, Scholar, Finance & Search |
| `GOOGLE_FACT_CHECK_KEY` | Pipeline Stage 4 | Free Google Cloud API key for Fact Check Tools API (`claims:search`) |
| `LLM_API_KEY` | Pipeline Stages 2, 3, 6 | LLM provider API key (OpenAI / Gemini / Anthropic) |
| `SUPABASE_URL` | Structured Storage | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Structured Storage | Supabase service key for Drizzle ORM queries |
| `DATABASE_URL` | Database Migrations | Postgres connection string for Drizzle ORM |
| `REDIS_URL` | Hot Cache | Redis connection string (e.g., `redis://localhost:6379`) |
| `PORT` | API Server | Express server port (default: `4000`) |
| `NEXT_PUBLIC_API_BASE_URL` | Frontend | URL of the Express API (default: `http://localhost:4000`) |

> [!WARNING]
> Never commit `.env` or any production secrets to Git. Only `.env.example` with blank or placeholder values may be committed.

---

## 4. Database Setup & Migrations

Push the Drizzle schema to your Supabase PostgreSQL instance:

```bash
npm run db:push
```

Or generate and run migrations:

```bash
npm run db:generate
npm run db:migrate
```

---

## 5. Running the Application Locally

Start the full stack (Next.js frontend + Express API) concurrently:

```bash
npm run dev
```

* **Frontend:** `http://localhost:3000`
* **Express API:** `http://localhost:4000`
* **Health Check:** `http://localhost:4000/api/health`

---

## 6. Running with Offline / Cached Demo Data

To run the application entirely offline without consuming external API credits:

1. Ensure the committed files in `data/cache/*.json` and `data/demo-videos.json` exist.
2. The pipeline will automatically hit the disk/database cache for any demo video ID and return instant results with 0 credit spend.
