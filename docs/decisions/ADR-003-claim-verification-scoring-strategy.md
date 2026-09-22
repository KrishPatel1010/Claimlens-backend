# ADR-003: Claim Verification & Trust Scoring Strategy

## Status
Accepted

## Context
ClaimLens must not produce an unstructured dump of search results. It must output an evidence-backed, transparent verdict for every factual claim.
The verification pipeline must address:
1. Prioritizing established professional fact-checking organizations.
2. Grounding claims across domains (medical/health vs. financial markets vs. general claims).
3. Calculating an objective, explainable Trust Score without hallucinating confidence.

## Decision
We implemented a multi-source verification routing and scoring algorithm:

### 1. Engine Routing
* **Primary Check:** Google Fact Check Tools API (`claims:search`). It is free, fast, and accesses indexed `claimReview` markup from accredited fact-checkers.
* **Grounding Fallback via SerpApi:**
  * Health/wellness claims → `google_scholar` (peer-reviewed scientific literature).
  * Personal-finance/stock claims → `google_finance` (historical prices, company filings, tickers).
  * General claims → `google` (web search engine).

### 2. Scoring Formula
$$\text{Trust Score} = \text{Grounding Score} \times \text{Source Authority Score}$$

* **Grounding Score (0.0 – 1.0):** Semantic evaluation comparing the claim assertion with the retrieved evidence snippet. Evaluated via LLM matching for v1.
* **Source Authority Score (by domain tier):**
  * Accredited Fact-Checking Organization (via Fact Check API) / Official Government / Peer-Reviewed Academic (.gov, .edu, PubMed, Nature): **1.0**
  * Established News & Reference Publisher: **0.7**
  * Other Indexed Websites: **0.4**
  * Unindexed / No Citation: **0.1**

### 3. Confidence Classification
* **High Confidence:** Multiple independent sources with Trust Scores $\ge 0.70$ agree.
* **Contested:** Evidence sources disagree or contradict the asserted claim. Surfaces conflicting claims side-by-side.
* **Unverified:** No credible source achieves a Trust Score $> 0.30$. The system declines to guess.

## Alternatives Considered
* **Local Embedding Similarity Model (v1):**
  * *Cons:* Requires deploying Python inference or heavy ONNX dependencies in the Node pipeline. Deferred to optional v2 stretch goal. LLM-based semantic comparison is sufficient, fast to iterate, and produces superior natural language contradiction reasoning.

## Consequences
### Positive
* Deterministic, explainable scoring that can be tested in pure isolation.
* Minimizes SerpApi credit consumption by checking the free Google Fact Check API first.
* Honest failure mode: claims with insufficient evidence are marked "Unverified" rather than hallucinating a judgment.

### Negative / Trade-offs
* Depends on LLM prompt stability for semantic similarity grading. Addressed by strict JSON schema validation for LLM outputs.

## Date
2026-09-19
