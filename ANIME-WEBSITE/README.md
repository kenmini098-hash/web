# Anime Atlas

## Run locally

1. Install Node.js 20 or later.
2. In `backend`, run `npm install`, then `npm start`.
3. Open `http://127.0.0.1:3000`.

The current implementation provides public browse/search, TV/film, genre and
year filters, and details using Wikidata. It does not include accounts,
favorites, catalog caching, images, or video. Account lifecycle choices remain
open. Recheck WDQS endpoint guidance before production; configure only an
approved Wikidata endpoint in `WIKIDATA_SPARQL_ENDPOINT`.

`CURSOR_SIGNING_KEY` is optional for local use. Configure a stable random
value of at least 32 bytes for deployments so page cursors remain valid across
process restarts and instances.

`.env.example` documents the supported environment variables; set them in the
shell or deployment environment. This starter does not load `.env` files.

## Personal-trial accounts

Email verification is not required. The planned login uses email and password;
email ownership is not claimed. SMTP is unnecessary for registration/login.
See [account policy](docs/ACCOUNT_POLICY.md). Account routes/UI are still pending;
removing verification does not make the whole account feature operational.
Password recovery is excluded by owner decision: no reset email or forgot-password
screen. SMTP is not needed for this trial. A forgotten password cannot be recovered.

## Account database foundation

The approved lifecycle is no fixed end date, voluntary deletion, and deletion
after 168 hours without authenticated activity. Account API/UI and email flows
are not connected yet; the database functions alone do not enable registration.

Set `DATABASE_URL` to a dedicated PostgreSQL database through the environment,
then run these commands from `backend`:

```text
npm run db:migrate
npm run accounts:cleanup
npm run accounts:cleanup -- --apply
```

The migration is transactional and versioned. Cleanup defaults to a count-only
preview; `--apply` deletes up to 100 inactive accounts and cascades their sessions,
favorites and tokens. Run again for remaining batches. No scheduler is installed
or enabled by these commands. During deployment, schedule cleanup every minute
and monitor errors/backlog; the 168-hour eligibility threshold is exact, while
physical deletion occurs on the next successful run. Do not enable account
registration before authenticated requests/login record activity and the cleanup
schedule has been tested. Backups retain deleted rows until their seven-day
rotation expires; run cleanup after a restore before reopening traffic.

`npm test` uses an isolated in-memory PGlite engine for SQL lifecycle tests.
Fixture accounts exist only in tests. This does not verify a production
PostgreSQL connection, concurrent clients, email delivery or scheduled execution.
