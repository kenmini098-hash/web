# Step 2 — Live Wikidata verification

Date: 2026-11-24. Product baseline: `27d050d` (no product-code changes during this step).

## Result

**17/17 bounded sequential HTTP checks passed**: 11 catalog checks and 6 account/favorite checks. All provider metadata was fetched from real Wikidata, without mocked responses. Requests used the approved 20-second total provider budget; the check client allows 22 seconds to receive the HTTP response. These are samples from one run, not latency percentiles or an availability guarantee.

| Check | Result / elapsed time |
| --- | --- |
| Health/security headers; invalid media-class genre | Correct HTTP 200 and 400 |
| Film Q21697406 | Year 2016; 3,132 ms |
| TV Q22126305 | Year 2013; 605 ms |
| Browse first / next | 20 + 20 items, no overlap; 7,243 / 3,635 ms |
| Japanese search + TV + year 2013 | Expected Q22126305; 1,209 ms |
| Film + year 2016 | Two matching films; 1,193 ms |
| Genre from current response facets | 20 matching items; 8,123 ms |
| Gundam Japanese search first / next | 6 + 4 qualified items, no overlap and advancing cursor; 1,387 / 898 ms |
| Temporary account register/login | Passed; 223 ms |
| Favorite add / repeated add | HTTP 201 / 200, real TV detail; 491 / 736 ms |
| Favorite list with metadata | Exactly one favorite, Q22126305/year 2013; 708 ms |
| Favorite removal / temporary account deletion | Passed; 11 / 7 ms |

List assertions checked nonempty titles, allowed entity types, source identifiers, null-or-integer years, no duplicate IDs within each page, and exclusion of TV/film classes from genres. Filter tests checked each returned item's actual year/type/genre. The check is not a manual independent verification of every Wikidata statement; missing-field completeness across the full catalog remains unknown.

## Evidence and boundaries

- [Catalog raw results](CATALOG_LIVE_CHECK_2026-11-24T03-17-40-125Z.json)
- [Favorite raw results](FAVORITES_LIVE_2026-11-24T03-18-01-239Z.json)
- Reproducible scripts: `backend/scripts/check-catalog.js`, `backend/scripts/check-live-favorites.js`; both are explicit live checks outside the offline test suite. Catalog reports now use timestamped filenames to preserve previous failures/results.
- Local server: `scripts/preview-accounts.js`, loopback port 3104, production Express routes with disposable PGlite persistence. No persistent personal accounts were used. The generated test account was deleted successfully. PostgreSQL durability is reserved for step 4.
- No new timeout or malformed-data failure occurred in this run. Historical timeouts remain evidence; the 8,123 ms genre result also exceeds the original 8-second latency target, while fitting the approved trial budget.
- This step verifies live HTTP integration. It does not re-execute the browser matrix or prove full-catalog accuracy, load capacity, current terms review or production SLO compliance.

## Handoff

- Phase: 4; step 2 — live Wikidata verification.
- Responsible agent: ChatGPT.
- Assigned task: verify current browse/search/filter/pagination/detail/favorite integration with real provider responses.
- Completed: 17 checks above; timestamped evidence preserved; temporary account removed.
- Files: this report, two JSON evidence files, two live-check scripts and current-status links.
- Tests: 17/17 live checks; script syntax and diff whitespace checks passed. No product-code changes required.
- Issues: no new failure in the sampled run; upstream variability and original latency targets remain unresolved.
- Remaining: steps 3–6; unavailable real-device/browser versions remain pending.
- Recommendation: proceed to step 3 when instructed; do not stress-test Wikidata.
- Status: **Step 2 complete for the listed live scenarios; whole-phase acceptance incomplete.**

