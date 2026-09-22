# ADR-004: Anonymous Public Access Model for Hackathon MVP

## Status
Accepted

## Context
Functional Requirements Document (`Project/01_FRD.md` §5.2) explicitly scopes out:
* User accounts, login, or saved history for the hackathon MVP.

Introducing authentication providers (e.g. Clerk, NextAuth, Auth0, Supabase Auth) would introduce friction for judges trying out the application, add unnecessary infrastructure complexity, and distract development focus from the core verification pipeline.

## Decision
For v1 (Hackathon MVP), ClaimLens will operate with **Anonymous Public Access**:
* Users do not need an account or login to submit URLs and review claim ledgers.
* Abuse protection is enforced via IP-based rate limiting and strict input schema validation on the Express API.
* All future authentication mechanisms (e.g., user profiles, saved claim history, API token keys) are formally marked as **TBD / Deferred**.

## Alternatives Considered
* **Supabase Auth / Social Login:**
  * *Cons:* Requires judges to authenticate before evaluating the tool. Violates hackathon friction-reduction principles.
* **API Keys for Client Access:**
  * *Cons:* Excessive overhead for a public web application demo.

## Consequences
### Positive
* Zero user onboarding friction for hackathon evaluators and public viewers.
* Eliminates auth-related security vulnerabilities (session fixation, CSRF tokens, credential leakage) from the MVP surface.
* Allows developers to focus 100% of efforts on verification accuracy and SerpApi integration.

### Negative / Trade-offs
* No persistent personalized user history across devices.
* Must rely on IP rate limiting to prevent unauthorized bulk queries from draining SerpApi credits.

## Date
2026-09-19
