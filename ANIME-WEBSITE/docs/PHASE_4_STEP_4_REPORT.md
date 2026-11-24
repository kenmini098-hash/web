# Step 4 — Populated backup and recovery verification

Date: 2026-11-24. Product baseline: `7cd656d`.

## Result

**Eight recovery/integrity checks passed** against actual local PostgreSQL. Two random databases were created for fixture source and restore; neither was the personal application database. Both temporary databases were confirmed removed afterward. An encrypted fixture archive remains in ignored `.local/backups/`; its key remains in ignored `.local/backup.key`. No credentials, plaintext dumps or password hashes are included in the report.

| Measurement | Observed |
| --- | --- |
| Fixture | 3 users, 3 sessions, 6 favorites, migration version row |
| Unused verification/recovery token tables | Both empty, consistent with owner policy |
| Custom PostgreSQL archive | 12,340 bytes |
| AES-256-GCM stored archive | 12,374 bytes |
| Dump/encrypt/write | 303 ms |
| Decrypt/restore/full-table comparison/password verification | 375 ms |
| Rehearsal through final data checks | 1,867 ms, excluding final connection/database teardown |

Raw evidence: [POPULATED_RESTORE_RESULTS.json](POPULATED_RESTORE_RESULTS.json).

## Checks performed

1. Altered ciphertext and an incorrect key fail authentication before restore.
2. Decrypted archive SHA-256 matches the original dump bytes.
3. All six table snapshots match, including account fields, Argon2id hashes, session hashes, timestamps, favorite ownership and migration version. Comparisons use sorted whole-row digests in memory; raw values are not published.
4. The restored active account's password verifies with Argon2id.
5. Cleanup removes exactly the account inactive for 169 hours and cascades its sessions/favorites.
6. Expired sessions are removed; freshly authenticated manual deletion cascades favorites while the other active account survives.
7. The populated fixture source remains unchanged after restored-data mutations.
8. The personal `anime_trial` database's six-table snapshot remains unchanged.

Safety boundaries: database names are generated and validated inside the script; cleanup drops only names this invocation successfully created. The original database is queried inside read-only snapshot transactions. Subprocess output containing possible credentials is suppressed on failure. Backups use the existing local archive format and key. The rehearsal creates no verification/recovery tokens and sends no provider traffic.

## Reproduce

With the dedicated local cluster running, from `backend`:

```powershell
node --env-file=../.local/app.env scripts/verify-populated-backup.js
```

The script requires the exact dedicated loopback cluster/application role, creates and migrates the fixture, encrypts and restores it, checks integrity/deletion behavior, and removes its temporary databases in cleanup. Failures return a nonzero exit status. Preserve the key separately from backups in durable operation.

## Limits and handoff

- This is a small populated local rehearsal. The measured 375 ms is not proof of production RTO <= 8 hours; no actual outage, large dataset, lost disk or remote infrastructure was simulated.
- RPO <= 24 hours and seven daily restore points remain unverified because no nightly schedule or off-machine storage has been configured. Scheduling/hosting remains deployment work; no new external service was selected.
- Password/hash and SQL lifecycle checks passed; browser login after disaster recovery and deployment signing-key recovery were not certified by this script.
- Phase: 4; responsible agent: ChatGPT.
- Assigned task: populated encrypted backup, isolated restore, account/favorite/session comparison and source integrity verification.
- Completed/files: `backend/scripts/verify-populated-backup.js`, JSON evidence, this report and operations/current-status documentation.
- Issues found: no integrity failure in the fixture. Operational recovery guarantees remain pending as described above.
- Remaining: step 5 findings from the load/security review; step 6 final acceptance and explicit owner decision.
- Recommendation: retain this rehearsal as evidence; resolve nightly retention/off-machine operation during deployment planning.
- Status: **Step 4 populated local rehearsal complete; production recovery targets and whole-phase acceptance incomplete.**
