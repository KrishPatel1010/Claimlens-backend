# ClaimLens — Development & Change Management Workflow

This document outlines the operational process for planning, implementing, verifying, and documenting changes in ClaimLens.

---

## 1. The 11-Step Change Management Workflow

Whenever implementing a substantial feature or modification, follow this sequence:

```text
 1. Understand requirement
        ↓
 2. Inspect current architecture
        ↓
 3. Identify affected modules
        ↓
 4. Identify architectural impact
        ↓
 5. Implement feature
        ↓
 6. Add/update tests
        ↓
 7. Update architecture diagrams (.mmd)
        ↓
 8. Update documentation
        ↓
 9. Create ADR if necessary
        ↓
10. Update CHANGELOG.md
        ↓
11. Review for architectural consistency
```

---

## 2. Architecture Synchronization Checklist

Before submitting a pull request or concluding a task, run through this verification checklist:

- [ ] **Zero `any`:** `npm run typecheck` passes with zero type assertions to `any`.
- [ ] **Modern Arrow Functions:** All newly created functions and components use `const fn = () => {}`.
- [ ] **Domain Variable Naming:** No single-letter variables (`c`, `x`, `v`, `i`) or generic placeholders (`abc`, `item`, `data`), including inside `.map()` and `.filter()`.
- [ ] **Credit Protection:** Does this change trigger external APIs? Verify that cache lookup order (Redis → DB → Disk → API) is strictly preserved.
- [ ] **Diagram Synchronization:** If a table, container, route, or service was added/modified, did you update the relevant `.mmd` diagram in `docs/architecture/`?
- [ ] **ADR Created:** If a significant technical or infrastructure decision was made, is an ADR recorded in `docs/decisions/`?
- [ ] **CHANGELOG Updated:** Entry added under the appropriate section in `CHANGELOG.md`.

---

## 3. Git Commit Conventions

ClaimLens follows conventional commit messages:

| Type | Purpose | Example |
|---|---|---|
| `feat:` | New feature or pipeline capability | `feat: add Stage 4 Google Fact Check Tools API integration` |
| `fix:` | Bug fix or error resolution | `fix: handle videos without available transcripts gracefully` |
| `refactor:` | Code change that neither fixes a bug nor adds a feature | `refactor: separate write-through cache logic from pipeline orchestrator` |
| `docs:` | Documentation or diagram changes only | `docs: synchronize database ERD with Drizzle schema changes` |
| `test:` | Adding missing tests or correcting existing tests | `test: add unit coverage for trust score computation` |
| `chore:` | Build tasks, configuration, or dependency updates | `chore: configure ESLint rules for arrow functions` |

### Prohibited Commit Messages
Never write vague commit messages such as `update`, `changes`, `stuff`, `fixes`, or `final`.

---

## 4. Pull Request & Review Standards

1. Run all checks locally:
   ```bash
   npm run lint
   npm run typecheck
   npm run test
   ```
2. Verify that no untracked secrets, `.env` files, or temporary artifacts are staged.
3. Confirm that all newly fetched external API responses for demo videos are saved in `data/cache/*.json` and committed to git for judge review.
