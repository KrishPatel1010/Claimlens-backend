# Architecture Decision Records (ADRs)

This directory documents all significant architectural decisions made for the ClaimLens project.

ADRs preserve the context, trade-offs, and consequences of choices so future maintainers, team members, and AI coding agents understand *why* the system is designed this way.

---

## Decision Lifecycle

* **Proposed:** Under active discussion and review; not yet implemented.
* **Accepted:** Approved and active across the codebase.
* **Superseded:** Replaced by a newer ADR (must include a link to the superseding ADR).
* **Rejected:** Considered but decided against after architectural evaluation.

---

## Index of Architecture Decisions

| ADR | Title | Status | Date |
|---|---|---|---|
| [ADR-001](./ADR-001-stack-selection.md) | Next.js Frontend + Express REST API Monorepo | Accepted | 2026-09-19 |
| [ADR-002](./ADR-002-four-tier-storage-and-write-through-caching.md) | Four-Tier Storage Architecture & Write-Through Caching | Accepted | 2026-09-19 |
| [ADR-003](./ADR-003-claim-verification-scoring-strategy.md) | Claim Verification & Trust Scoring Algorithm | Accepted | 2026-09-19 |
| [ADR-004](./ADR-004-auth-strategy-v1.md) | Anonymous Public Access Model for Hackathon MVP | Accepted | 2026-09-19 |

---

## ADR Template

When authoring a new ADR, create a file named `ADR-XXX-brief-title.md` following this structure:

```markdown
# ADR-XXX: [Title]

## Status
[Proposed | Accepted | Superseded | Rejected]

## Context
What problem are we solving? What are the constraints, requirements, and background?

## Decision
What specific technical choice was made? Describe the architecture, library, or pattern chosen.

## Alternatives Considered
* **Option A:** Pros and cons.
* **Option B:** Pros and cons.

## Consequences
### Positive
* What benefits do we gain?

### Negative / Trade-offs
* What complexity or limitations are introduced?

## Date
YYYY-MM-DD
```
