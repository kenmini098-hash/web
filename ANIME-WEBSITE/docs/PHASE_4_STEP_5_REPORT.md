# Step 5 — Findings review and regression

Date: 2026-11-24. Product baseline: `843630e`.

## Findings disposition

| Finding | Assessment and action | Status |
| --- | --- | --- |
| Shared-IP traffic rejected | Confirmed expected enforcement of the documented 120 account requests/minute/IP and 10 authentication requests/15 minutes/IP. This conflicts with unconditional capacity acceptance for users sharing a network. Raising limits or changing the bucket identity changes the security/traffic policy. No limit was silently changed. | Owner decision required |
| Concurrent login above 500 ms | Confirmed: HTTP p95 1,018.73 ms in step 3. An additional diagnostic with unchanged Argon2id parameters measured service p95 101.78/166.41/315.26/766.97 ms at concurrency 1/2/4/10. Queue wait and HTTP/SQL are excluded from these diagnostic figures. Limiting concurrency does not eliminate end-user queue time. | Owner decision required |
| Crowded mobile header | Fixed in `5d50d26`; four browser/engine regression runs passed afterward. No new UI changes in steps 2–5. | Resolved in tested scope |
| Stale documentation | Current task-board rows and the final acceptance entry now point to dated step 1–5 evidence; historical tests/timeouts remain retained. | Reconciled via current status |
| Safari/iOS/Android and previous browser releases | No real devices or those releases available. Windows WebKit is not evidence for Safari on an Apple device. Existing 39/39 browser groups and 80 layout checks remain dated Nov 21. | Untested, not waived |
| Nightly/off-machine recovery and deployment controls | Step 4 proves small populated local restore, not schedules, RPO/RTO, HTTPS/proxy or production logging. | Deferred/pending, not silently removed |

## Proposed owner decision

**A — Retain the personal-trial configuration (recommended for the stated personal/free experiment).** Keep Argon2id parameters, 120 account requests/minute/IP and 10 authentication requests/15 minutes/IP. Explicitly accept that this local trial has not met the original unconditional shared-IP capacity and concurrent-login p95 <=500 ms criteria. Retain measured failures and unsupported-device rows in final acceptance. This is a scoped trial exception, not certification of production capacity or approval to start Phase 5.

**B — Keep the original capacity/latency criteria as mandatory.** Leave those rows unaccepted and continue engineering work before final acceptance. A revised limiter policy, resource envelope and representative route/IP distribution must be proposed and approved, then measured on the intended runtime. No guarantee is made that a code-only change on this machine can meet the target. Password hashing protection must remain intact.

The owner subsequently selected **A** on 2026-11-24. Option B is retained as the alternative considered, not an active task. The approved exception applies only to the personal trial: preserve the measured shared-IP throttling and concurrent-login latency limitations without treating the original operational targets as achieved. No production policy or crypto parameter was changed.

## Regression and evidence

- See `ARGON2_CAPACITY_DIAGNOSTIC.json` for the bounded additional diagnostic; ten valid verifications per concurrency level, no external calls, random credentials omitted from output. Diagnostic data is not an HTTP load acceptance result.
- Full automated suite rerun: 28/28 passed. Real PostgreSQL account HTTP suite rerun: 7/7 passed. Temporary schemas were isolated from personal account data.
- Browser and live-provider regressions are retained from their latest relevant revisions: `BROWSER_QA_REPORT.md` (Nov 21), `PHASE_4_STEP_2_REPORT.md` (Nov 24). No product code changed since those runs; repeated live queries or a new browser run would not resolve the capacity-policy decision.
- No new concrete High/Critical issue was identified within the reviewed scope. Independent whole-system approval and final owner acceptance remain outstanding.

## Handoff

- Phase: 4; step 5.
- Responsible agent: ChatGPT.
- Task: review findings, fix within approved scope and verify regressions.
- Completed: root-cause diagnostic, finding disposition, current-status reconciliation, regression run and two concrete decision options.
- Files: this report, diagnostic evidence, task-board/acceptance status updates.
- Owner decision: A approved on 2026-11-24; keep Argon2id, 120 account requests/minute/IP and 10 authentication requests/15 minutes/IP.
- Outstanding: unsupported-platform and deployment evidence remain explicit; final acceptance is reserved for step 6.
- Recommendation: carry the approved trial exceptions into the final acceptance report.
- Status: **Step 5 complete with owner-approved personal-trial exceptions. Whole-phase acceptance incomplete; Phase 5 not authorized.**
