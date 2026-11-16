# Anime Atlas

## Run locally

1. Install Node.js 20 or later.
2. In `backend`, run `npm install`, then `npm start`.
3. Open `http://127.0.0.1:3000`.

The implementation provides public browse/search, filters and details using
Wikidata, plus email/password accounts, favorites, password change, export and
account deletion. There is no catalog cache, image or video feature.
Recheck WDQS endpoint guidance before production; configure only an
approved Wikidata endpoint in `WIKIDATA_SPARQL_ENDPOINT`.

`CURSOR_SIGNING_KEY` is optional for local use. Configure a stable random
value of at least 32 bytes for deployments so page cursors remain valid across
process restarts and instances.

`.env.example` documents the supported environment variables; set them in the
shell or deployment environment. This starter does not load `.env` files.

## Personal-trial accounts

Email verification is not required. Login uses email and password;
email ownership is not claimed. SMTP is unnecessary for registration/login.
See [account policy](docs/ACCOUNT_POLICY.md). Account routes require a configured
PostgreSQL database; otherwise they return a service-unavailable error.
Password recovery is excluded by owner decision: no reset email or forgot-password
screen. SMTP is not needed for this trial. A forgotten password cannot be recovered.

## Account database foundation

The approved lifecycle is no fixed end date, voluntary deletion, and deletion
after 168 hours without authenticated activity. Anonymous sessions expire after
one hour; authenticated sessions after 30 days. Passwords require at least 12
characters and at most 256 UTF-8 bytes. Authentication is limited to 10 requests
per IP per 15 minutes in this single-process trial.

Set `DATABASE_URL` to a dedicated PostgreSQL database through the environment,
then run these commands from `backend`:

```text
npm run db:migrate
npm run accounts:cleanup
npm run accounts:cleanup -- --apply
```

The migration is transactional and versioned. Cleanup defaults to a count-only
preview; `--apply` deletes up to 100 inactive accounts and cascades their sessions,
favorites and tokens. Run again for remaining batches. The running server with a
configured database runs cleanup on startup and every minute, skipping overlaps.
Accounts past 168 hours cannot authenticate even before physical cleanup.
Monitor failures/backlog: physical deletion occurs on the next successful run.
Backups retain deleted rows until their seven-day
rotation expires; run cleanup after a restore before reopening traffic.

`npm test` uses isolated in-memory PGlite for SQL tests by default. Set
`TEST_DATABASE_URL` to run account HTTP tests against real PostgreSQL in a random
temporary schema, which is removed afterward. Fixture accounts exist only in tests.

## Local account setup

Set `DATABASE_URL` and `ACCOUNT_SECRET` (at least 32 bytes). Production requires
HTTPS and secure cookies. For loopback development only, set `LOCAL_HTTP=1`.
Secrets belong in ignored environment files; never commit them or paste them in chat.
Without persistent PostgreSQL, a disposable UI test is available via
`node scripts/preview-accounts.js` from `backend`, on port 3104. Its data disappears
when stopped; it is explicitly not a production database.

The workspace-local portable PostgreSQL setup uses `.local/postgres`, port 55434,
and an ignored `.local/app.env`. Once provisioned, run from `backend`:

```text
node --env-file=../.local/app.env sever.js
node --env-file=../.local/app.env --test test/accounts.test.js
```

The application then listens on `http://127.0.0.1:3105`. No system service is
installed. Do not delete `.local` if you want to keep your local accounts.
See the Phase 4 acceptance report for checks still outstanding; implementation
does not itself constitute release approval.
