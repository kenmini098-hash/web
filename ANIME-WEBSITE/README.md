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
