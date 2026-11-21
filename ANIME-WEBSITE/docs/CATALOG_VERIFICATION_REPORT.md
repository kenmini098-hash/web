# Phase 4 catalog verification

Date: 2026-11-21

- Phase: 4, implementation and acceptance preparation.
- Responsible agent: ChatGPT.
- Task: continue the approved 20-second personal trial and reconcile acceptance evidence.
- Completed: restored the approved shared 20-second provider deadline after commit `357bee9` changed it to 8 seconds; updated the regression assertion and current contract/operations documentation. Favorites use the same exported deadline. No database or account policy changes.
- Files: `backend/wikidata.js`, `backend/test/wikidata.test.js`, and the documentation in this commit.
- Tests: `npm test` passed 27/27 on 2026-11-21. The shared-budget test verifies 20,000 ms initially and 13,000 ms after the first upstream call consumes 7 seconds. Tests also cover retries, concurrency, cursors, filtering, normalization, account isolation and session security.

## Historical live evidence

These files record the implementation tested on **2026-11-17**, before the subsequent provider changes in `357bee9`. They are not a new live acceptance run of the current revision.

| Evidence | Observed result |
| --- | --- |
| `CATALOG_LIVE_CHECK.json` | 8/9 checks passed; TV detail timed out at about 20 seconds |
| `CATALOG_RETEST.json` | Separate TV-detail retry succeeded in 2,273 ms; original failure remains recorded |
| `CATALOG_SEARCH_PAGING.json` | Two search pages advanced but both had no qualified records; does not prove populated search pagination |

Historical browse evidence includes two pages of 20 records without overlap, plus genre, film/year and Japanese-search checks. Those successes do not establish a latency SLO or catalog-wide accuracy.

## Outstanding and handoff

- Current-revision bounded live probes on 2026-11-21 passed: browse returned 20 records in 10,229 ms; TV detail Q22126305 returned in 442 ms. See `CATALOG_CURRENT_PROBE.json`. The browse result exceeded the original 8-second target but fit the approved 20-second deadline. These two probes do not replace the full live matrix.
- Current-revision full live provider matrix and browser regression checks remain pending; the 27-test run uses controlled provider responses.
- Wikidata latency is variable; a 20-second deadline does not guarantee success. The original p95/p99 goals have not been demonstrated.
- Full supported-browser, load and populated backup-recovery acceptance remain pending.
- Recommendation: run `node scripts/check-catalog.js` from `backend` against the running local app, preserving these historical results separately before generating a new report. Record failures as well as successes.
- Status: **Chua hoan thanh** (whole-phase acceptance incomplete). No Phase 5 transition or publication.
