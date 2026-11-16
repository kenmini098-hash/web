# Local personal-trial operations

The local PostgreSQL cluster is under `.local/pgdata`, bound only to 127.0.0.1:55434.
The application role owns `anime_trial` and is not a superuser. No Windows service
or paid hosting was installed. Binaries came from the [EDB archive linked by
PostgreSQL](https://www.postgresql.org/download/windows/); the installed binary
reports PostgreSQL 18.7.

## Start and stop

From `ANIME-WEBSITE/backend` in PowerShell, start the existing database:

```powershell
& '../.local/postgres/pgsql/bin/pg_ctl.exe' -D '../.local/pgdata' -l '../.local/postgres.log' -w start
node --env-file=../.local/app.env sever.js
```

Visit `http://127.0.0.1:3105/account.html`. Use Ctrl+C in the application's
terminal to stop it. Then stop the database cleanly:

```powershell
& '../.local/postgres/pgsql/bin/pg_ctl.exe' -D '../.local/pgdata' -m fast -w stop
```

Do not run `configure-local-db.js` again against an existing initialized setup.
It refuses to overwrite `app.env`. Do not delete `.local` to reset the app unless
you intend to discard its accounts and local keys. The zip and unused installer
components are not needed for normal app execution.

## Checks

```text
npm test
node --env-file=../.local/app.env --test test/accounts.test.js
node --env-file=../.local/app.env scripts/accounts.js cleanup
```

The real database test creates a random temporary schema and drops only that
schema afterward. Cleanup without `--apply` only counts inactive accounts.
The running application cleans up at startup and every minute; shutdown pauses
physical cleanup, but overdue accounts cannot log in or renew their activity.

## Backup and restore plan

```text
node --env-file=../.local/app.env scripts/verify-local-backup.js
```

This local-only rehearsal dumps the trial database in memory, encrypts it with
AES-256-GCM, writes a backup in `.local/backups`, decrypts/authenticates it, restores
to a newly created `anime_restore_*` database, checks migration/table access, and
drops that temporary database. It never restores over the original database.
It is bounded to 64 MiB dumps. The key is `.local/backup.key`; losing it makes the
encrypted backups unreadable. Keep a protected copy of the key separately from
backups when setting up durable backup storage.

Before release, schedule nightly encrypted backups, retain seven daily restore
points, and rehearse restoration with populated user/favorite data. Target RPO
24 hours and RTO 8 hours; the local smoke rehearsal does not establish those
service guarantees. No nightly OS schedule or off-machine backup was installed
in this phase. Backup copies of deleted accounts expire with retention; clean
up overdue accounts after restoration before reopening user traffic.

## Known limits

- HTTP with non-Secure cookies is allowed only on loopback with `LOCAL_HTTP=1`.
  Production must use HTTPS, `NODE_ENV=production`, a stable `ACCOUNT_SECRET`
  and secure cookies; never expose this local setup publicly.
- Rate counters and two-request provider concurrency limits are per process.
- There is no email verification, password recovery, catalog cache or paid API.
- The general Wikidata browse query can exceed the eight-second deadline. The
  UI reports the failure instead of replacing it with invented records.
