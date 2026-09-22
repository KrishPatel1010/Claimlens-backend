# ClaimLens — Engineering & Coding Conventions

All code committed to ClaimLens must adhere to these standards. These conventions reflect the authoritative rules defined in [`rules.md`](../../rules.md).

---

## 1. Zero `any` Policy & TypeScript Strictness

* **Never use `any`:** `any`, `Array<any>`, `Promise<any>`, `Record<string, any>`, or `as any` are strictly prohibited.
* **Use `unknown` for unchecked data:** Narrow safely using Zod schemas, type guards, or discriminated unions.
* **Strict Compiler Options:** Strict mode, `noImplicitAny`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes` are enabled.

```ts
// GOOD: Safe narrowing with Zod
const parseApiResponse = (rawApiResponse: unknown): ApiResponse => {
  const validationResult = apiResponseSchema.safeParse(rawApiResponse);
  if (!validationResult.success) {
    throw new ValidationError(validationResult.error);
  }
  return validationResult.data;
};
```

---

## 2. Modern JavaScript & Mandatory Arrow Functions

* **No legacy `function` declarations:** All functions, utilities, handlers, React components, and methods must use arrow functions assigned to constants (`const fn = () => { ... }`).
* **Explicit Return Types:** Required on all top-level, exported, and service functions.

```ts
// BAD: Legacy declaration
function calculateTrustScore(grounding: number, authority: number) { ... }

// GOOD: Modern arrow function with explicit domain types
export const calculateTrustScore = (
  groundingSimilarityScore: number,
  sourceAuthorityScore: number,
): number => {
  return groundingSimilarityScore * sourceAuthorityScore;
};
```

---

## 3. Domain-Driven Naming Conventions

* **No single-letter identifiers:** Single-letter variables (`a`, `b`, `c`, `x`, `i`, `v`, `e`) are strictly prohibited.
* **No dummy/throwaway names:** Avoid `abc`, `foo`, `bar`, `data`, `res`, `req`, `item`, `temp`, `val`, `stuff`, `thing`.
* **Higher-order functions & iterators:** In `.map()`, `.filter()`, `.reduce()`, `.find()`, and loops, the parameter MUST be the singular, descriptive domain name of what is in the collection.

```ts
// BAD: Single-letter and vague naming
const res = claims.map((c) => c.text);
const good = items.filter((x) => x.score > 0.7);

// GOOD: Self-documenting domain identifiers
const claimTexts = extractedClaims.map(
  (extractedClaim) => extractedClaim.rawText,
);

const highConfidenceClaims = verifiedClaims.filter(
  (verifiedClaim) => verifiedClaim.trustScore >= HIGH_CONFIDENCE_THRESHOLD,
);
```

---

## 4. File & Symbol Casing Rules

| Artifact | Casing Style | Example |
|---|---|---|
| **Files & Directories** | `kebab-case` | `calculate-trust-score.ts`, `claim-ledger.tsx` |
| **React Components** | `PascalCase` | `ClaimLedger`, `VideoPlayer`, `EvidenceCard` |
| **Functions & Methods** | `camelCase` (verb/action) | `fetchVideoTranscript`, `extractCheckableClaims` |
| **Variables & Parameters** | `camelCase` (domain noun) | `normalizedClaimText`, `youtubeVideoId` |
| **Types & Interfaces** | `PascalCase` (domain entity) | `ClaimCategory`, `SourceAuthorityScore` |
| **Constants** | `UPPER_SNAKE_CASE` | `MAXIMUM_SERPAPI_BUDGET_CREDITS` |
| **Booleans** | Prefix with `is`, `has`, `should` | `isHighConfidence`, `hasConflictingEvidence` |

---

## 5. Architectural Boundaries

* **Route Files:** Thin HTTP routers only; no business logic.
* **Controllers:** Request extraction, validation dispatch, invoking application services.
* **Services:** Business and pipeline orchestration; unaware of Express `Request`/`Response`.
* **Repositories:** Data persistence via Drizzle ORM; no business rules.
* **External Clients:** Isolated in `clients/` with strict response normalization.
* **UI Components:** Depend only on clean application/domain types; never on database or provider models.

---

## 6. Error Handling & Structured Logging

* **Machine-readable error codes:** Always return `{ error: { code: "VIDEO_NOT_FOUND", message: "..." } }`.
* **No silent catches:** Never catch and ignore errors with empty handlers or blind `console.log`.
* **Never leak secrets:** Never log API keys, user tokens, or database credentials.
