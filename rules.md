# ClaimLens — Global Engineering Rules

> This document is the authoritative engineering contract for all AI coding agents and developers working on ClaimLens.
>
> These rules apply to the entire repository unless a more specific directory-level instruction explicitly overrides them.

---

# 1. CORE ENGINEERING PRINCIPLES

ClaimLens is a production-oriented TypeScript application.

Code must prioritize:

1. Correctness
2. Type safety
3. Maintainability
4. Separation of concerns
5. Testability
6. Security
7. Observability
8. Performance
9. Simplicity
10. Explicit architecture

Do not optimize for writing the smallest amount of code.

Optimize for code that another engineer can understand and safely modify.

---

# 2. ZERO `any` POLICY

`any` is prohibited.

Do not use:

```ts
any
```

including:

```ts
Array<any>
Promise<any>
Record<string, any>
```

Do not use `any` merely to silence TypeScript errors.

Do not use:

```ts
as any
```

Do not introduce implicit `any`.

If the type is unknown:

```ts
unknown
```

must be used instead.

Then narrow it safely.

Example:

```ts
const parseApiResponse = (rawApiResponse: unknown): ApiResponse => {
  if (!isApiResponse(rawApiResponse)) {
    throw new Error("Invalid API response");
  }

  return rawApiResponse;
};
```

Use proper type guards, schemas, discriminated unions, generics, or explicit interfaces.

If a third-party library has poor typings, isolate the unsafe boundary in one small adapter rather than spreading unsafe types throughout the application.

---

# 3. TYPESCRIPT MUST BE FULLY TYPED

TypeScript strict mode is mandatory.

The project must use:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

Adjust only when technically required by the selected framework/toolchain.

Avoid unnecessary type assertions.

Prefer:

```ts
const validatedClaimStatus = candidateClaimStatus satisfies ClaimStatus;
```

over unnecessary:

```ts
const validatedClaimStatus = candidateClaimStatus as ClaimStatus;
```

Types must describe real domain concepts.

Do not create meaningless types such as:

```ts
type Data = object;
type ResponseData = Record<string, unknown>;
```

when the actual structure is known.

---

# 4. DOMAIN TYPES

Important ClaimLens concepts must have explicit types.

Examples:

```ts
type ClaimCategory =
  | "health"
  | "financial"
  | "general";

type ClaimStatus =
  | "pending"
  | "processing"
  | "verified"
  | "conflicting"
  | "failed";
```

Prefer discriminated unions when states have different data.

Example:

```ts
type VerificationResult =
  | {
      status: "verified";
      trustScore: number;
      verifiedClaimText: string;
    }
  | {
      status: "conflicting";
      trustScore: number;
      conflictingClaims: string[];
    }
  | {
      status: "failed";
      reason: string;
    };
```

Avoid boolean combinations that create invalid states.

Bad:

```ts
{
  isVerified: boolean;
  hasConflict: boolean;
  isFailed: boolean;
}
```

---

# 5. VALIDATE ALL EXTERNAL INPUTS

Never trust external input.

Validate data at application boundaries:

* HTTP request bodies
* query parameters
* route parameters
* environment variables
* external API responses
* Redis values
* filesystem JSON
* database results where appropriate
* LLM output

Use a runtime validation library such as Zod if selected by the project architecture.

TypeScript types alone are NOT runtime validation.

This is unsafe:

```ts
const unvalidatedPayload = incomingHttpRequest.body as ProcessVideoRequest;
```

Instead:

```ts
const parsingResult = processVideoRequestSchema.safeParse(
  incomingHttpRequest.body,
);

if (!parsingResult.success) {
  throw new ValidationError(parsingResult.error);
}

const validatedVideoRequest = parsingResult.data;
```

---

# 6. FRONTEND ARCHITECTURE

The frontend must maintain strict separation of responsibilities.

Recommended structure:

```text
frontend/
├── app/
├── components/
├── features/
├── hooks/
├── lib/
├── services/
├── types/
├── utils/
└── styles/
```

Adapt the structure when justified, but preserve separation of concerns.

---

# 7. PAGE COMPONENTS MUST STAY THIN

Pages must primarily handle:

* route composition
* layout
* page-level data orchestration
* loading/error boundaries
* passing data into components

Pages must NOT contain:

* large business logic
* database queries
* complex API implementation
* scoring algorithms
* parsing logic
* reusable transformation logic
* large event handlers
* duplicated validation logic

Bad:

```tsx
export const ClaimsPage = () => {
  // 300 lines of processing,
  // filtering,
  // scoring,
  // API calls,
  // formatting...
};
```

Prefer:

```tsx
export const ClaimsPage = () => {
  return (
    <ClaimsPageView
      verifiedClaims={verifiedClaims}
      activeCategoryFilters={activeCategoryFilters}
    />
  );
};
```

Complex logic belongs in appropriate modules.

---

# 8. COMPONENT RESPONSIBILITIES

React components should generally follow:

```text
Component
    ↓
Presentation
    ↓
Props
```

A component should not simultaneously:

* fetch data
* transform complex domain data
* validate API responses
* perform business calculations
* render UI
* manage unrelated state

Separate those responsibilities.

---

# 9. COMPONENT ORGANIZATION

Use reusable components where reuse or clear responsibility exists.

Example:

```text
components/
├── ui/
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Badge.tsx
│   └── Dialog.tsx
│
├── claims/
│   ├── ClaimCard.tsx
│   ├── ClaimLedger.tsx
│   ├── ClaimStatusBadge.tsx
│   └── ClaimEvidenceList.tsx
│
└── video/
    ├── VideoPlayer.tsx
    └── VideoTimeline.tsx
```

Do not create generic components prematurely.

Avoid:

```text
UniversalComponent
GenericContainer
CommonThing
DataRenderer
```

unless there is a genuine reusable abstraction.

---

# 10. FEATURE-BASED FRONTEND CODE

Feature-specific behavior should live close to the feature.

Example:

```text
features/
└── claims/
    ├── components/
    ├── hooks/
    ├── services/
    ├── types/
    ├── utils/
    └── index.ts
```

This prevents unrelated features from becoming coupled.

---

# 11. FRONTEND SERVICES

API communication must not be scattered across components.

Bad:

```tsx
const claimsResponse = await fetch("/api/claims");
```

repeated throughout multiple components.

Prefer:

```text
services/
└── claims/
    ├── get-claims.ts
    ├── get-claim-evidence.ts
    └── process-video.ts
```

or an equivalent feature-oriented structure.

Services own communication with the backend.

Components consume typed service functions.

---

# 12. API CLIENT TYPES

Frontend API responses must be explicitly typed.

Example:

```ts
interface ClaimResponse {
  id: string;
  timestampSeconds: number;
  rawText: string;
  category: ClaimCategory;
  status: ClaimStatus;
}
```

Do not pass untyped API responses directly into components.

---

# 13. BACKEND ARCHITECTURE

The Express backend must follow clear layers.

Recommended:

```text
backend/src/
├── config/
├── controllers/
├── routes/
├── services/
├── repositories/
├── pipeline/
├── clients/
├── schemas/
├── domain/
├── middleware/
├── errors/
├── utils/
├── types/
└── app.ts
```

Adapt where appropriate, but preserve the dependency boundaries.

---

# 14. ROUTES

Routes define HTTP endpoints.

Routes should be thin.

They should primarily:

1. Receive the HTTP request.
2. Invoke the controller.
3. Return the result.

Do not put business logic inside route declarations.

Bad:

```ts
router.post("/videos/process", async (incomingRequest, outgoingResponse) => {
  // 100 lines of logic
});
```

Prefer:

```ts
router.post(
  "/videos/process",
  validate(processVideoSchema),
  processVideoController,
);
```

---

# 15. CONTROLLERS

Controllers translate HTTP concerns into application calls.

Controllers may handle:

* request extraction
* request validation integration
* authentication/authorization context
* invoking services
* response formatting
* HTTP status codes

Controllers must NOT contain:

* database queries
* Redis queries
* SerpApi calls
* scoring algorithms
* LLM prompts
* complex business rules
* filesystem logic

Bad:

```text
Controller
 ├── Redis
 ├── PostgreSQL
 ├── SerpApi
 ├── LLM
 └── scoring
```

Preferred:

```text
Controller
    ↓
Service
    ↓
Repository / Client
```

---

# 16. SERVICES

Services contain application/business orchestration.

Example:

```text
processVideo()
    ↓
TranscriptService
    ↓
ClaimExtractionService
    ↓
ClassificationService
    ↓
FactCheckService
    ↓
GroundingService
    ↓
ScoringService
```

Services should coordinate operations without knowing HTTP implementation details.

A service should not depend directly on Express `Request` or `Response`.

Bad:

```ts
const processVideo = async (
  incomingRequest: Request,
  outgoingResponse: Response,
): Promise<void> => {};
```

Good:

```ts
const processVideo = async (
  videoProcessingInput: ProcessVideoInput,
): Promise<ProcessVideoResult> => {
  // business orchestration
};
```

---

# 17. REPOSITORIES

Repositories own persistence.

Repositories may interact with:

* Supabase/PostgreSQL
* Drizzle ORM
* Redis where appropriate
* filesystem persistence where explicitly required

Repositories must NOT contain business rules.

Example:

```ts
interface ClaimRepository {
  findById(claimId: string): Promise<Claim | null>;

  findByVideoId(youtubeVideoId: string): Promise<Claim[]>;

  create(createClaimInput: CreateClaimInput): Promise<Claim>;
}
```

Business decisions belong in services/domain logic.

---

# 18. DATABASE ACCESS

Do not query the database directly from:

* React components
* pages
* controllers
* route files

Database access must go through repositories/data-access modules.

This makes the persistence layer replaceable and testable.

---

# 19. EXTERNAL API CLIENTS

Every external integration must have an isolated client/adapter.

Examples:

```text
clients/
├── serpapi/
├── google-fact-check/
├── youtube/
└── llm/
```

Do not scatter external API calls throughout services.

Bad:

```text
Service A → fetch(SerpApi)
Service B → fetch(SerpApi)
Service C → fetch(SerpApi)
```

Prefer:

```text
Service
   ↓
SerpApiClient
   ↓
SerpApi
```

---

# 20. EXTERNAL API RESPONSES

External API responses must be treated as `unknown` until validated.

Never assume the provider response matches your TypeScript interface.

Use:

```text
External response
      ↓
Validation
      ↓
Normalization
      ↓
Domain type
```

Do not leak provider-specific response structures into the domain.

---

# 21. DOMAIN VS PROVIDER TYPES

Do not use SerpApi/Google/LLM response types throughout the application.

Create internal domain models.

Example:

```ts
interface Evidence {
  sourceType: SourceType;
  sourceUrl: string;
  sourceDomain: string;
  authorityScore: number;
  matchedText: string;
  groundingSimilarity: number;
}
```

The SerpApi adapter transforms:

```text
SerpApiResponse
      ↓
SerpApiAdapter
      ↓
Evidence
```

This prevents vendor lock-in throughout the codebase.

---

# 22. PIPELINE ARCHITECTURE

The seven-stage ClaimLens pipeline must remain explicitly separated.

```text
Stage 1
Transcript Fetching
        ↓
Stage 2
Claim Extraction
        ↓
Stage 3
Claim Classification
        ↓
Stage 4
Fact Checking
        ↓
Stage 5
SerpApi Grounding
        ↓
Stage 6
Scoring
        ↓
Stage 7
Ledger Formatting
```

Do not collapse all stages into one service.

Each stage must have:

* clear input
* clear output
* explicit type
* single responsibility
* testable behavior

---

# 23. PIPELINE STAGE CONTRACTS

Each stage should expose a typed contract.

Example:

```ts
interface PipelineStage<TInput, TOutput> {
  execute(stageInput: TInput): Promise<TOutput>;
}
```

Use concrete types for each stage.

Avoid:

```ts
PipelineStage<any, any>
```

Prefer:

```ts
PipelineStage<
  TranscriptResult,
  ExtractedClaims
>
```

---

# 24. SCORING LOGIC

Scoring must be isolated from API and presentation code.

Do not calculate trust scores inside:

* React components
* controllers
* database repositories
* API clients

Use a dedicated scoring/domain module.

Example:

```text
domain/
└── scoring/
    ├── calculate-grounding-score.ts
    ├── calculate-authority-score.ts
    ├── calculate-trust-score.ts
    └── types.ts
```

Scoring functions should be deterministic and independently testable.

---

# 25. REDIS CACHE

Redis access must be encapsulated.

Do not directly access Redis throughout the application.

Use a dedicated cache abstraction.

Example:

```ts
interface ClaimCache {
  get(cacheKey: ClaimCacheKey): Promise<CachedClaim | null>;

  set(
    cacheKey: ClaimCacheKey,
    cachedClaimRecord: CachedClaim,
  ): Promise<void>;
}
```

Cache keys must be generated by a single deterministic utility.

---

# 26. SERPAPI CREDIT PROTECTION

This is a hard requirement.

Never bypass the cache unnecessarily.

Before making an expensive SerpApi request:

```text
Normalize claim
      ↓
Generate deterministic hash
      ↓
Redis lookup
      ↓
Supabase lookup
      ↓
Disk cache lookup
      ↓
External API
```

Never add an external API call merely for convenience.

Never make duplicate SerpApi calls for the same normalized claim unless explicitly required.

Preserve the project's 250-credit budget.

Any architectural change affecting API usage must explicitly consider credit consumption.

---

# 27. CACHE FALLBACKS

Cache fallback logic must be centralized.

Do not duplicate:

```text
Redis → DB → Disk → API
```

inside multiple services.

Create a reusable orchestration layer.

---

# 28. FILESYSTEM CACHE

The committed:

```text
data/cache/
```

directory represents inspectable raw evidence.

Do not store arbitrary application state there.

Use deterministic filenames.

Do not commit:

* secrets
* tokens
* credentials
* personal data
* temporary files
* huge generated artifacts

unless explicitly required by the project specification.

---

# 29. ENVIRONMENT VARIABLES

Never hard-code secrets.

Bad:

```ts
const key = "sk-...";
```

Never commit:

```text
.env
.env.local
```

unless explicitly required and containing no secrets.

Maintain:

```text
.env.example
```

with variable names and descriptions.

Environment configuration must be validated at application startup.

---

# 30. ERROR HANDLING

Use centralized error handling.

Create typed application errors where appropriate.

Example:

```ts
class AppError extends Error {
  constructor(
    errorMessage: string,
    public readonly errorCode: string,
    public readonly httpStatusCode: number,
  ) {
    super(errorMessage);
  }
}
```

Do not expose internal stack traces to clients in production.

Do not use:

```ts
catch (caughtError) {
  console.log(caughtError);
}
```

and silently continue.

Handle failures intentionally.

---

# 31. ERROR CODES

API errors should have stable machine-readable codes.

Example:

```json
{
  "error": {
    "code": "VIDEO_NOT_FOUND",
    "message": "The requested video was not found."
  }
}
```

Do not force frontend code to parse human-readable messages.

---

# 32. LOGGING

Use structured logging.

Logs should contain useful context such as:

* request ID
* operation
* video ID
* claim ID
* pipeline stage
* external provider
* error code
* duration where appropriate

Never log:

* API keys
* access tokens
* secrets
* sensitive user data

Use appropriate log levels:

```text
debug
info
warn
error
```

Avoid excessive `console.log`.

---

# 33. ASYNC CODE

Prefer `async/await`.

Always handle rejected promises.

Do not create unnecessary sequential requests when operations are independent.

Use:

```ts
await Promise.all(...)
```

only when the operations are actually safe to execute concurrently.

Do not parallelize requests merely for performance if it can:

* increase API credits
* violate rate limits
* create race conditions
* overload services

---

# 34. API CONTRACTS

Every endpoint must have:

* defined input
* validation
* defined output
* documented errors
* correct HTTP status codes

Do not return arbitrary objects from controllers.

Define response types.

---

# 35. HTTP STATUS CODES

Use appropriate status codes.

Examples:

```text
200 OK
201 Created
202 Accepted
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
429 Too Many Requests
500 Internal Server Error
502 Bad Gateway
503 Service Unavailable
```

Do not use `200` for every outcome.

---

# 36. API VERSIONING

Do not introduce versioning unnecessarily for the MVP.

If API versioning becomes necessary, implement it consistently.

Do not mix:

```text
/api/v1/...
/api/...
/v2/...
```

without architectural justification.

---

# 37. SECURITY

Always consider:

* input validation
* rate limiting
* CORS
* SSRF
* URL validation
* request size limits
* dependency vulnerabilities
* secret management
* injection attacks
* malicious LLM output
* untrusted external responses

YouTube URLs and external URLs are untrusted input.

Never assume a URL is safe simply because it comes from a user.

---

# 38. LLM OUTPUT

LLM output is untrusted external data.

Never assume an LLM follows the requested JSON structure.

Validate it.

Use:

```text
LLM
 ↓
unknown
 ↓
schema validation
 ↓
normalized domain object
```

Never directly execute or render arbitrary LLM output as trusted HTML/code.

---

# 39. REACT STATE

Do not put all state into global state.

Use the smallest appropriate scope.

Prefer:

```text
local state
    ↓
feature state
    ↓
global state
```

Only introduce global state when multiple distant parts of the application genuinely require it.

---

# 40. SERVER VS CLIENT COMPONENTS

For Next.js:

Prefer Server Components by default.

Use Client Components only when required for:

* browser APIs
* interaction
* local state
* event handlers
* client-only libraries

Do not add:

```tsx
"use client";
```

to large parent components unnecessarily.

Keep client boundaries small.

---

# 41. UI COMPONENTS

UI components should not know about database implementation.

Bad:

```tsx
<ClaimCard
  databaseRecord={supabaseResult}
/>
```

Prefer domain/application data:

```tsx
<ClaimCard
  claim={claim}
/>
```

The UI should depend on stable application types, not infrastructure types.

---

# 42. UTILS

Do not create a giant:

```text
utils.ts
```

Create focused utilities.

Good:

```text
utils/
├── normalize-claim.ts
├── hash-claim.ts
├── format-timestamp.ts
└── validate-youtube-url.ts
```

A utility must have a clear responsibility.

---

# 43. CONSTANTS

Do not scatter magic values.

Bad:

```ts
if (calculatedTrustScore > 0.72) {}
```

Prefer:

```ts
const TRUST_SCORE_HIGH_THRESHOLD = 0.72;
```

Domain constants should live in an appropriate domain/config module.

---

# 44. FILE SIZE

Avoid excessively large files.

As a guideline, investigate files approaching:

```text
300–400 lines
```

and strongly consider decomposition around:

```text
500+ lines
```

These are guidelines, not arbitrary laws.

Do not split files simply to satisfy a line count.

Split when responsibilities are genuinely separate.

---

# 45. FUNCTION SIZE

Functions should perform one coherent operation.

If a function:

* validates input
* queries database
* calls external APIs
* transforms data
* calculates scores
* formats response

it is probably doing too much.

Extract meaningful operations.

---

# 45A. MODERN JAVASCRIPT & ARROW FUNCTION SYNTAX

Modern JavaScript/TypeScript arrow syntax is mandatory.

Always define functions, components, handlers, and methods using arrow functions assigned to constants:

```ts
const functionName = (parameterName: ParameterType): ReturnType => {
  // implementation
};
```

Or for asynchronous operations:

```ts
const asyncFunctionName = async (
  parameterName: ParameterType,
): Promise<ReturnType> => {
  // implementation
};
```

This applies uniformly across the entire repository:

* **Utility functions**: `export const normalizeClaimText = (rawClaimText: string): string => ...`
* **Service functions**: `export const extractClaimsFromTranscript = async (transcript: VideoTranscript): Promise<ExtractedClaim[]> => ...`
* **Controllers & Handlers**: `export const handleProcessVideoRequest = async (request: Request, response: Response): Promise<void> => ...`
* **Express Middleware**: `export const validateRequestBody = (schema: ZodSchema): RequestHandler => (req, res, next) => ...`
* **React Components**: `export const ClaimLedger = ({ claimsList }: ClaimLedgerProps): JSX.Element => ...`
* **Custom React Hooks**: `export const useVideoClaims = (youtubeVideoId: string) => ...`
* **Array callbacks**: `.map((claimRecord) => ...)`

### Strict Rules:

1. **PROHIBITED:** Legacy `function` declarations:
   ```ts
   // BAD: Never use legacy function declarations
   function calculateScore(input: ScoringInput): number { ... }
   async function fetchTranscript(videoId: string) { ... }
   ```
2. **MANDATORY:** Arrow function assignments:
   ```ts
   // GOOD: Clean, modern arrow function
   const calculateScore = (scoringInput: ScoringInput): number => { ... };
   const fetchTranscript = async (youtubeVideoId: string): Promise<TranscriptResult> => { ... };
   ```
3. **Explicit Return Types:** All exported and top-level functions must explicitly state their return type.
4. **Lexical Scope Integrity:** Arrow functions guarantee lexical `this` binding and consistent closure behavior without `.bind(this)`.

---

# 46. REDUNDANCY

Do not duplicate:

* validation
* API clients
* database queries
* scoring logic
* cache logic
* formatting logic
* constants
* domain types

Before creating new logic, search the repository for an existing implementation.

Reuse existing abstractions when appropriate.

Do not duplicate code simply because the existing abstraction is slightly inconvenient.

If an abstraction is poorly designed, refactor it.

---

# 47. DRY — WITH JUDGMENT

Do not blindly abstract everything.

Three similar lines of code do not automatically require a framework.

Avoid premature abstractions.

Prefer:

```text
clear duplication
        ↓
identify stable common behavior
        ↓
extract abstraction
```

Do not create generic systems for hypothetical future requirements.

---

# 48. DEPENDENCY DIRECTION

Maintain a predictable dependency direction.

Preferred backend:

```text
Routes
  ↓
Controllers
  ↓
Services
  ↓
Domain
  ↓
Repositories / Infrastructure
```

External clients should be infrastructure adapters.

Avoid:

```text
Repository → Controller
Database → UI
Domain → Express
Domain → React
Domain → SerpApi
```

Domain logic should not depend on framework implementation details.

---

# 49. CIRCULAR DEPENDENCIES

Circular dependencies are prohibited.

If:

```text
A → B
B → A
```

appears, refactor the architecture.

Possible solutions:

* extract shared domain types
* introduce an abstraction
* invert dependency
* move shared logic to the correct layer

Do not solve circular dependencies with arbitrary lazy imports.

---

# 50. IMPORTS

Keep imports clean.

Prefer project aliases where configured.

Avoid long relative paths such as:

```ts
../../../../../../utils/foo
```

Use a consistent alias strategy.

Remove unused imports.

Do not use barrel files everywhere by default.

Create `index.ts` barrels only when they improve module boundaries.

---

# 51. DOMAIN-DRIVEN NAMING & IDENTIFIER CONVENTIONS

Naming must communicate business and domain intent. Every variable, parameter, function, and type must reflect the ClaimLens problem space.

Do NOT use generic names, dummy placeholders, or single-letter identifiers.

### 51.1 STRICT PROHIBITION ON GENERIC AND DUMMY IDENTIFIERS

Never use:
* **Single-letter variables:** `a`, `b`, `c`, `d`, `e`, `i`, `j`, `k`, `n`, `r`, `s`, `t`, `v`, `x`, `y`, `z`
* **Dummy/throwaway placeholders:** `abc`, `foo`, `bar`, `baz`, `test`, `sample`, `dummy`
* **Vague generic labels:** `data`, `res`, `req`, `item`, `el`, `val`, `temp`, `tmp`, `stuff`, `thing`, `obj`, `arr`, `info`, `result`, `record`, `elem`, `helper`, `manager`, `handler`
* **Ambiguous contractions:** `ctx` (use `pipelineContext` or `executionContext`), `err` (use `caughtError`), `auth` (use `authoritativeSource` or `sourceAuthorityScore`)

Whenever you are tempted to name a variable `item` or `data`, stop and ask: **"What domain entity does this represent?"**
* If it is a claim: use `extractedClaim`, `candidateClaim`, or `verifiedClaim`.
* If it is a video: use `youtubeVideoRecord`, `processedVideo`, or `candidateVideo`.
* If it is evidence: use `groundingEvidenceItem`, `factCheckEvidence`, or `scholarArticleEvidence`.
* If it is a transcript piece: use `transcriptSegment`.

### 51.2 HIGHER-ORDER FUNCTIONS & ARRAY ITERATORS (.map, .filter, .reduce, .find, etc.)

In callbacks for `.map()`, `.filter()`, `.reduce()`, `.find()`, `.some()`, `.forEach()`, and `for...of` loops, the iterator parameter MUST ALWAYS be the explicit, singular domain name of the collection being processed.

Single-letter iterator variables (`c =>`, `x =>`, `e =>`, `v =>`) are STRICTLY PROHIBITED.

**Bad (NEVER write code like this):**
```ts
// PROHIBITED: Single-letter and generic iterator parameters
const scores = claims.map((c) => c.score);
const healthClaims = items.filter((x) => x.cat === "health");
const found = list.find((e) => e.id === id);
const totalScore = claims.reduce((acc, curr) => acc + curr.trustScore, 0);
videos.forEach((v) => sync(v));
```

**Good (MANDATORY domain-descriptive iteration):**
```ts
// CORRECT: Fully typed, self-documenting domain identifiers
const claimTrustScores = verifiedClaims.map(
  (verifiedClaim) => verifiedClaim.trustScore,
);

const healthClaims = extractedClaims.filter(
  (extractedClaim) => extractedClaim.category === "health",
);

const matchingEvidence = candidateEvidenceList.find(
  (evidenceItem) => evidenceItem.id === targetEvidenceId,
);

const totalTrustScore = verifiedClaims.reduce(
  (accumulatedTrustScore, currentVerifiedClaim) =>
    accumulatedTrustScore + currentVerifiedClaim.trustScore,
  0,
);

processedVideos.forEach((processedVideo) => {
  syncVideoToDatabase(processedVideo);
});
```

### 51.3 CASING AND NAMING RULES

Files:
```text
kebab-case (e.g., calculate-trust-score.ts, fetch-youtube-transcript.ts)
```

React components:
```text
PascalCase (e.g., ClaimLedger, VideoPlayer, EvidenceAccordion)
```

Functions:
```text
camelCase verb/action (e.g., calculateTrustScore, fetchVideoTranscript, extractCheckableClaims)
```

Variables & Parameters:
```text
camelCase domain noun (e.g., normalizedClaimText, youtubeVideoId, groundingSimilarityScore)
```

Types/Interfaces:
```text
PascalCase domain entity (e.g., ClaimCategory, SourceAuthorityScore, ProcessVideoInput)
```

Constants:
```text
UPPER_SNAKE_CASE domain configuration (e.g., MAXIMUM_SERPAPI_BUDGET_CREDITS, DEFAULT_SIMILARITY_THRESHOLD)
```

Booleans:
```text
Prefix with is, has, should, can (e.g., isHighConfidence, hasConflictingEvidence, shouldBypassHotCache)
```

---

# 52. COMMENTS

Prefer self-explanatory code.

Comments should explain:

* why something exists
* architectural constraints
* non-obvious behavior
* external API limitations
* security considerations
* performance tradeoffs

Do not write comments that merely repeat the code.

Bad:

```ts
// Increment processed claims counter
processedClaimsCount++;
```

Good:

```ts
// SerpApi limits require sequential execution here.
// Parallel requests could exceed the configured credit budget.
```

---

# 53. TODO POLICY

Do not leave vague TODOs.

Bad:

```ts
// TODO fix this
```

Good:

```ts
// TODO(#123): Replace polling with SSE after MVP submission.
```

If there is no issue tracker, include enough context to make the TODO actionable.

---

# 54. TESTING

Every meaningful business rule must be testable.

Prioritize tests for:

* claim normalization
* claim hashing
* classification
* scoring
* cache lookup order
* cache fallback behavior
* API validation
* external response normalization
* pipeline stages
* error handling

Do not test implementation details unnecessarily.

Test behavior.

---

# 55. PURE BUSINESS LOGIC

Prefer pure functions for deterministic calculations.

Example:

```ts
const calculateTrustScore = (
  groundingSimilarityScore: number,
  sourceAuthorityScore: number,
): number => {
  return groundingSimilarityScore * sourceAuthorityScore;
};
```

should not:

* access Redis
* access PostgreSQL
* call SerpApi
* read environment variables

Pure domain logic is easier to test.

---

# 56. DATABASE MIGRATIONS

Database schema changes must be version controlled.

Never manually change production schema without a migration.

Every schema change must update:

* migration
* schema definitions
* relevant repository types
* affected documentation
* ERD if relationships change

---

# 57. DATABASE SCHEMA CONSISTENCY

When changing database models:

```text
Schema
 ↓
Migration
 ↓
Repository
 ↓
Domain/Application types
 ↓
API contract
 ↓
Frontend types
 ↓
ERD
```

Review every affected layer.

Do not update only the database and assume everything else will work.

---

# 58. API / DATABASE / UI BOUNDARY

Do not allow database-specific objects to leak through every layer.

Preferred:

```text
Database Model
      ↓
Repository
      ↓
Domain Model
      ↓
Service
      ↓
API Response DTO
      ↓
Frontend
      ↓
UI Model
```

Use direct mappings when the structures are genuinely identical, but preserve boundaries where they matter.

---

# 59. GIT

Use conventional commit-style prefixes:

```text
feat:
fix:
refactor:
docs:
test:
chore:
build:
ci:
```

Examples:

```text
feat: add claim verification pipeline
fix: handle missing transcript
refactor: isolate SerpApi client
docs: update architecture diagrams
test: add trust score coverage
```

Do not commit generated junk.

---

# 60. ARCHITECTURE DOCUMENTATION

The architecture diagrams in:

```text
docs/architecture/
```

are part of the codebase.

They are not optional documentation.

Whenever architecture changes, inspect:

```text
01-system-context.mmd
02-container-architecture.mmd
03-component-architecture.mmd
04-data-flow.mmd
05-authentication-flow.mmd
06-database-erd.mmd
07-api-flow.mmd
08-deployment-architecture.mmd
```

Update only the affected diagrams.

---

# 61. CODEBASE ↔ DIAGRAM CONSISTENCY

The implementation and architecture diagrams must not contradict each other.

If code introduces:

* a new service
* a new database entity
* a new external integration
* a new infrastructure dependency
* a new pipeline stage
* a new major module

evaluate the diagrams.

If the diagram claims something exists that the code no longer implements, update the diagram.

---

# 62. ARCHITECTURE DECISION RECORDS

Create an ADR when making a significant architectural decision.

Examples:

* changing database
* changing framework
* changing authentication
* adding a major external service
* changing cache architecture
* changing pipeline architecture
* introducing a queue
* introducing a major state-management strategy

Do not create ADRs for trivial refactors.

---

# 63. NO SILENT ARCHITECTURAL CHANGES

Do not silently introduce:

* new infrastructure
* new external APIs
* new databases
* new services
* new authentication
* new queues
* new cloud providers

without documenting the architectural impact.

---

# 64. NO INVENTED REQUIREMENTS

Never implement features merely because they seem useful.

Do not invent:

* authentication
* accounts
* saved history
* dashboards
* notifications
* admin panels
* analytics
* microservices

unless the requirements explicitly call for them.

For the hackathon MVP, respect the FRD and technical specification as the source of truth.

---

# 65. REQUIREMENT CONFLICTS

When requirements conflict:

1. Identify the conflict.
2. Check the FRD.
3. Check the technical specification.
4. Check existing ADRs.
5. Prefer the most authoritative/current requirement.
6. If ambiguity remains and the decision materially affects architecture, stop and request clarification.

Do not silently guess.

---

# 66. HACKATHON SCOPE CONTROL

ClaimLens is being developed for a hackathon.

Do not over-engineer the MVP.

Avoid introducing:

* microservices
* event buses
* Kubernetes
* complex distributed systems
* unnecessary abstraction layers
* unnecessary infrastructure

unless explicitly justified.

Production-grade code does NOT mean unnecessary complexity.

---

# 67. PERFORMANCE

Optimize meaningful bottlenecks.

Prioritize:

* avoiding duplicate external API calls
* caching
* efficient database queries
* appropriate indexes
* avoiding unnecessary React renders
* avoiding unnecessary network requests
* streaming/polling only where useful
* reasonable payload sizes

Do not prematurely optimize.

Measure before making complex performance changes where practical.

---

# 68. ACCESSIBILITY

Frontend UI must follow basic accessibility requirements.

Use:

* semantic HTML
* labels
* keyboard navigation
* accessible buttons
* meaningful alt text
* focus states
* appropriate ARIA only where necessary

Do not use ARIA to compensate for poor semantic HTML.

---

# 69. UI/UX

Do not duplicate visual styles manually.

Use the project's established design system.

Centralize:

* colors
* spacing
* typography
* reusable UI components
* states

Avoid arbitrary one-off styling unless there is a real design requirement.

---

# 70. RESPONSIVENESS

The application must work across:

* desktop
* tablet
* mobile

Do not build desktop-only layouts unless explicitly required.

---

# 71. LOADING / ERROR / EMPTY STATES

Every asynchronous UI feature should consider:

```text
Loading
Success
Empty
Error
```

Do not assume data always exists.

For long-running verification:

```text
Queued
Processing
Completed
Failed
```

must be represented explicitly where appropriate.

---

# 72. ACCESSIBLE DATA VISUALIZATION

Claims, evidence, trust scores, and statuses should not communicate information through color alone.

Provide:

* labels
* icons where useful
* text status
* accessible descriptions

---

# 73. OBSERVABILITY OF PIPELINE

The verification pipeline should provide enough observability to diagnose failures.

Track where appropriate:

```text
video ID
claim ID
pipeline stage
processing duration
cache hit/miss
external provider
error code
```

Avoid logging sensitive values.

---

# 74. RETRIES

Do not blindly retry every failure.

Retries should consider:

* transient network errors
* rate limits
* provider availability
* idempotency
* credit consumption

Never retry an expensive API indefinitely.

---

# 75. RATE LIMITING

Public anonymous access requires protection against abuse.

Respect the architecture's rate-limiting requirements.

Do not implement authentication merely to solve rate limiting.

Authentication is explicitly deferred for v1.

---

# 76. AUTHENTICATION

Current MVP architecture:

```text
NO AUTHENTICATION
```

Users access ClaimLens anonymously.

Do not introduce:

* Clerk
* Auth0
* Supabase Auth
* Firebase Auth
* custom login

unless the requirements change.

Future authentication is:

```text
TBD / Deferred
```

If authentication is later introduced, create an ADR and update the architecture diagrams.

---

# 77. CORS

CORS configuration must be explicit.

Do not use:

```ts
origin: "*"
```

in production without deliberate justification.

Keep allowed origins configurable.

---

# 78. URL SECURITY

User-provided URLs must be validated.

Protect against:

* invalid URLs
* unsupported protocols
* SSRF
* localhost/private-network access where applicable
* malicious redirects

Do not blindly fetch arbitrary URLs from user input.

---

# 79. DEPENDENCIES

Before adding a dependency ask:

1. Do we actually need it?
2. Is the functionality already available?
3. Is it actively maintained?
4. Does it introduce significant bundle/runtime cost?
5. Does it introduce security risk?
6. Does it duplicate an existing dependency?

Avoid dependency bloat.

---

# 80. NO DUPLICATE LIBRARIES

Do not introduce:

```text
three HTTP clients
four date libraries
multiple validation libraries
multiple state managers
multiple UI frameworks
```

without an explicit architectural reason.

Prefer one established solution.

---

# 81. EXTERNAL DEPENDENCY WRAPPERS

Third-party dependencies should be isolated when they represent important infrastructure.

Example:

```text
SerpApi
   ↓
SerpApiClient
   ↓
ClaimLens domain
```

This prevents third-party implementation details from contaminating the entire application.

---

# 82. FRONTEND DATA FETCHING

Use one consistent data-fetching strategy.

Do not randomly mix:

```text
fetch
axios
React Query
SWR
custom hooks
```

unless there is a documented reason.

Choose the appropriate strategy for the application and document it.

---

# 83. FORM HANDLING

Forms must:

* validate input
* show validation errors
* prevent duplicate submission
* handle loading state
* handle server errors
* provide accessible labels

Do not trust client-side validation alone.

---

# 84. DATE / TIME

Use a consistent timezone strategy.

Store timestamps in a consistent representation.

Do not mix:

```text
local time
UTC
Unix timestamps
```

without explicit conversion.

Claim timestamps should remain deterministic and clearly represented.

---

# 85. SERIALIZATION

Do not serialize arbitrary class instances or complex objects across API boundaries.

Use explicit DTOs / serializable structures.

---

# 86. SECURITY OF ERROR MESSAGES

Do not expose:

* SQL errors
* internal filesystem paths
* API keys
* stack traces
* provider credentials
* internal infrastructure details

to public clients.

---

# 87. REVIEW BEFORE COMPLETION

Before declaring a task complete, inspect:

```text
git diff
```

and verify:

* no debug code
* no secrets
* no `any`
* no unused imports
* no dead code
* no duplicated logic
* no broken types
* no failing tests
* no architecture inconsistencies
* diagrams updated where necessary
* documentation updated where necessary

---

# 88. REQUIRED VALIDATION

After meaningful changes, run the appropriate:

```text
typecheck
lint
tests
build
```

Do not claim a task is complete if validation has not been performed.

If a validation step cannot run, explicitly state why.

Never claim tests passed without actually running them.

---

# 89. GENERATED CODE

Generated code must still follow repository standards.

Do not blindly commit generated output.

Review generated code for:

* security
* typing
* unnecessary dependencies
* architecture violations
* duplicate logic

---

# 90. AI AGENT BEHAVIOR

When modifying the repository:

1. Inspect before editing.
2. Understand existing architecture.
3. Search before creating new abstractions.
4. Reuse existing utilities where appropriate.
5. Make the smallest coherent change.
6. Preserve existing behavior unless intentionally changing it.
7. Update tests.
8. Update documentation.
9. Update architecture diagrams when required.
10. Validate the result.

Do not rewrite unrelated files.

Do not perform broad refactors during feature implementation unless necessary.

---

# 91. AI MUST NOT HIDE ERRORS

Never:

* suppress TypeScript errors
* add `@ts-ignore`
* add `eslint-disable` without justification
* use `as any`
* catch and ignore errors
* remove tests to make builds pass
* weaken validation to make external data fit

If the architecture makes something difficult, fix the architecture or explicitly document the constraint.

---

# 92. TYPE ESCAPE HATCHES

The following require strong justification:

```ts
as SomeType
@ts-ignore
@ts-expect-error
eslint-disable
non-null assertion (!)
```

Prefer proper narrowing.

If an escape hatch is genuinely required, add a concise comment explaining why.

---

# 93. COMPLETION STANDARD

A feature is NOT complete merely because the UI works.

A complete implementation includes, where applicable:

```text
Implementation
    ↓
Types
    ↓
Validation
    ↓
Tests
    ↓
Error handling
    ↓
Documentation
    ↓
Architecture diagrams
    ↓
ADR
    ↓
Lint
    ↓
Typecheck
    ↓
Build
```

Only perform the applicable steps, but do not skip them merely for convenience.

---

# 94. FINAL PRINCIPLE

Every piece of code must have a clear home.

Every responsibility must have a clear owner.

Every external dependency must have a clear boundary.

Every important architectural decision must be documented.

Every important business rule must be testable.

Every external input must be validated.

Every type must be explicit.

Every architectural change must be reflected in documentation.

The goal is not merely:

> "The application works."

The goal is:

> "The application works, the architecture is understandable, the code is maintainable, the system is testable, and another engineer or AI agent can safely continue development."

---

# CLAIMLENS ARCHITECTURAL FLOW

Maintain this conceptual dependency direction:

```text
                    ┌─────────────────┐
                    │    Frontend     │
                    │    Next.js      │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │      API        │
                    │     Routes      │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   Controllers   │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    Services     │
                    └───────┬─┬───────┘
                            │ │
                 ┌──────────┘ └──────────┐
                 ▼                       ▼
          ┌─────────────┐        ┌──────────────┐
          │   Domain    │        │   Clients    │
          │   Logic     │        │ External APIs│
          └──────┬──────┘        └──────────────┘
                 │
                 ▼
          ┌─────────────┐
          │Repositories │
          └──────┬──────┘
                 │
        ┌────────┼─────────┐
        ▼        ▼         ▼
      Redis   Supabase    Disk
```

The exact implementation may evolve, but dependency direction must remain intentional.

---

# ARCHITECTURE SYNCHRONIZATION

Whenever architecture changes:

```text
CODE
 ↕
TYPES
 ↕
API CONTRACTS
 ↕
DATABASE
 ↕
ARCHITECTURE DIAGRAMS
 ↕
ADR
 ↕
DOCUMENTATION
```

These must remain consistent.

If you change one layer, inspect the others.

Never leave the repository in a state where the implementation and architecture documentation disagree.
