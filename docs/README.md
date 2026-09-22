# ClaimLens — System Documentation Hub

Welcome to the ClaimLens technical documentation system.

This repository is designed so that human engineers and AI coding agents can understand the system's architecture, conventions, and operational workflows without ambiguity.

---

## Documentation Structure

```text
docs/
├── architecture/          # Visual architecture documentation in Mermaid format
│   ├── 01-system-context.mmd
│   ├── 02-container-architecture.mmd
│   ├── 03-component-architecture.mmd
│   ├── 04-data-flow.mmd
│   ├── 05-authentication-flow.mmd
│   ├── 06-database-erd.mmd
│   ├── 07-api-flow.mmd
│   ├── 08-deployment-architecture.mmd
│   └── README.md
│
├── decisions/             # Architecture Decision Records (ADRs)
│   ├── ADR-001-stack-selection.md
│   ├── ADR-002-four-tier-storage-and-write-through-caching.md
│   ├── ADR-003-claim-verification-scoring-strategy.md
│   ├── ADR-004-auth-strategy-v1.md
│   └── README.md
│
├── development/           # Developer setup, conventions, and workflows
│   ├── setup.md
│   ├── conventions.md
│   └── workflow.md
│
└── README.md              # Documentation overview (this file)
```

---

## Core Guides

1. **[Visual Architecture Index](./architecture/README.md):** Links to all C4 diagrams, ERDs, and data flows.
2. **[Architecture Decision Records](./decisions/README.md):** Log of technical choices, context, trade-offs, and status.
3. **[Setup Guide](./development/setup.md):** Prerequisites, environment configuration, database setup, and local execution.
4. **[Engineering Conventions](./development/conventions.md):** Strict TypeScript policies, arrow functions, domain naming, and casing rules.
5. **[Development Workflow](./development/workflow.md):** 11-step change management cycle and git conventions.

---

## Golden Architectural Rules

* **Synchronized Documentation:** The codebase, diagrams, ADRs, and documentation must always remain synchronized.
* **No Invented Architecture:** If a decision or infrastructure has not been confirmed, it must be explicitly marked `TBD`.
* **Zero `any` Policy:** Strict type safety across all boundaries.
* **Credit Protection:** Never bypass the 4-tier cache (Redis → Supabase → Disk → API) when interacting with external APIs.
