# Phase 4 browser regression report

Date: 2026-11-21

## Results

| Browser actually executed on Windows | Version | Passed groups |
| --- | --- | --- |
| Installed Google Chrome, headless | 157.0.8103.79 | 10/10 |
| Installed Microsoft Edge, headless | 157.0.4341.46 | 10/10 |
| Playwright Firefox build, headless | 159.0 | 9/9 |
| Playwright WebKit build, headless | 27.2 | 10/10 |

All **39 groups passed**, with no uncaught JavaScript exceptions. Machine-readable evidence: [BROWSER_QA_RESULTS.json](BROWSER_QA_RESULTS.json). This is compatibility evidence for these exact builds, not every browser/version.

Each browser exercised catalog rendering, Japanese search, combined type/genre/year filters, pagination retaining submitted criteria, filter clearing, empty results, provider timeout/retry, detail retry, keyboard dialog opening/Escape/focus return, anonymous favorite redirect, native invalid-form rejection, registration, keyboard login, session persistence after reload, favorite add/list/remove, JSON export, password change, logout/login, reauthentication and confirmed account deletion.

Catalog, detail dialog, login and signed-in account pages were checked at **320, 375, 768, 1024 and 1440 CSS pixels**: 80 layout checks without horizontal overflow. Chrome, Edge and WebKit additionally passed emulated mobile touch checks for the card/dialog and email field. Firefox was tested with viewport resizing, not mobile-device emulation.

The initial visual review found the catalog header crowded into one row at mobile widths. The mobile stylesheet now allows wrapping and places the source note on its own row. The complete browser suite passed again after this fix, including an assertion for the note's position. Screenshots were inspected for catalog, detail and account flows; local captures are in `.local/browser-qa/results/` (not production assets).

## Test boundaries

- Browser automation uses the production Express app and frontend with a fresh disposable PGlite SQL database per browser. Account/password/session/favorite writes execute against that database. It never connects to the user's persistent account database.
- Catalog HTTP responses and favorite metadata are controlled test fixtures. They are confined to the QA process/browser and are not added to product data. This makes timeout, empty-state and retry checks repeatable; it does not verify Wikidata availability.
- Separately, Orca's embedded browser rendered the real Wikidata catalog with 20 entries; its console was empty when checked. That surface is not counted as Chrome or Safari certification.
- Safari on macOS, iOS Safari and Android Chrome on real devices were **not available**. WebKit on Windows is not Safari/iOS. Previous major browser releases were not installed/tested. Those rows in the original support matrix remain pending.
- No load test, accessibility certification or production HTTPS deployment certification is claimed by this run. The 20-second provider deadline remains subject to source timeouts.

## Reproduce

From `ANIME-WEBSITE/backend`, with Chrome and Edge installed:

```powershell
npm install --prefix ../.local/browser-qa --no-save playwright@1.65.1
node ../.local/browser-qa/node_modules/playwright/cli.js install firefox webkit
node scripts/check-browsers.js
```

Tooling is outside production dependencies. The script starts loopback-only temporary servers, closes them and their databases, writes the JSON result above, and exits nonzero on a failed browser run.

## Handoff

- Phase: 4.
- Responsible agent: ChatGPT.
- Task: recheck browser behavior and fix discovered regressions.
- Completed/files: mobile header fix in `frontend/css/responsive.css`; reproducible checks in `backend/scripts/check-browsers.js`; this report and JSON evidence.
- Issues found: crowded mobile header, fixed and retested.
- Remaining: unavailable real-device/Safari/previous-release matrix, load and other whole-phase acceptance gates.
- Recommendation: accept these tested browser rows as evidence; keep untested platforms explicitly pending.
- Status: available-browser checks complete; whole-phase acceptance remains incomplete. No transition to Phase 5.
