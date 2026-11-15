# Phase 2 - Anime API and Data Verification

**Snapshot:** 2026-11-14
**Research role:** ChatGPT research agent (GPT-6 Astra, assigned by the owner)
**Review:** ChatGPT project coordinator checked the cited primary sources and
reproduced the public Kitsu search request. This is a technical evidence
summary, not legal advice. Wikidata is selected for follow-up verification
only; no API provider or video source is approved for integration.

## Executive summary - initial comparison

No candidate is ready for production approval. AniList documents broad
discovery features but currently warns of a temporary 30-request/minute limit;
its API-specific rights for persistent or commercial reuse were not verified.
Kitsu's JSON:API is usable for public reads and a sample search succeeded, but
its published specification is old, its `/edge` interface has no stability
guarantee, and current quota and reuse terms are unknown. Jikan documents
useful operational behavior, but it scrapes MyAnimeList; the relationship
between Jikan's open-source license and rights to MyAnimeList data is not
established. MyAnimeList's current terms raise a material production-use
concern.

At the time of this initial comparison, the launch region was undecided. The
owner later selected Japan; alternatives must be evaluated for that market.
No reviewed metadata API grants this project video rights; omit playback and
external watch links unless rights and terms are confirmed for Japan and the
proposed use.

Subsequent Japan/no-cost research tested three Japanese anime titles against
Wikidata and verified Japanese labels and generic descriptions for three
anime-TV entities. These samples do not establish catalog completeness or
synopsis quality. The owner selected Wikidata for follow-up only; the
operational migration and unknown quota/SLO remain unresolved.

## Candidate comparison

### AniList GraphQL

- **API and data:** Public GraphQL endpoint `https://graphql.anilist.co`, using
  `POST` with a GraphQL query. Public metadata queries do not require user
  authentication; OAuth is documented for authenticated user features. The
  `Media` schema includes multilingual titles, descriptions, dates, formats,
  episodes, genres, scores, popularity, related works, and `updatedAt`.
  Pagination uses `Page`/`pageInfo`; the guide says `perPage` is capped at 50
  and warns `total`/`lastPage` may be inaccurate, so clients should use
  `hasNextPage`. [Introduction](https://anilist.gitbook.io/anilist-apiv2-docs/docs/guide/introduction.md),
  [Media schema](https://docs.anilist.co/reference/object/media),
  [Pagination](https://anilist.gitbook.io/anilist-apiv2-docs/docs/guide/graphql/pagination.md)
  (accessed 2026-11-14).
- **Representative response:** The official query example returns
  `data.Page.pageInfo` and `data.Page.media[]`, with `id` and `title` fields.
  This is documentation-grounded, not a live test. The docs note titles are
  not unique; do not identify or merge works by title alone.
- **Limits/operations:** The official guide states a normal limit of 90
  requests/minute but currently warns of a temporary degraded limit of 30
  requests/minute. It documents 429/timeouts, rate-limit headers, and burst
  limiting, and says increased-limit requests are not currently accepted.
  No recovery date is given. [Rate limits](https://docs.anilist.co/guide/rate-limiting)
  (accessed 2026-11-14). Current availability beyond that warning was not
  independently verified.
- **Freshness/rights:** The schema exposes `updatedAt`, but no refresh cadence,
  completeness SLA, or API-specific license for commercial display or durable
  storage was verified. The linked site terms provide only limited personal,
  non-commercial use; whether they govern API responses is unclear. Obtain
  written permission or clearer API-specific terms before production use.
  [Terms link](https://anilist.co/terms) (accessed 2026-11-14).
- **Region/attribution:** No API country-availability matrix or API-specific
  attribution rule was verified. Check target-market law and request
  requirements directly with AniList before approval.

### Kitsu JSON:API

- **API and data:** The official Kitsu API specification describes JSON:API
  reads at `https://kitsu.io/api/edge`, including
  `GET /anime?filter[text]=...`; bracketed query parameters must be URL
  encoded. Most public-facing `GET` endpoints do not require authentication.
  It documents title, synopsis, dates, ratings, images, episode details, and
  relationships. [Kitsu API specification](https://github.com/hummingbird-me/api-docs/blob/master/apiary.apib)
  (accessed 2026-11-14).
- **Pagination/response:** The specification gives a default page size of 10,
  maximum 20, and `links` for first/next/last pages. One observed public
  request for Cowboy Bebop returned JSON:API `data[]` entries with `id`,
  `type`, `attributes`, and relationship links. The response included a
  `youtubeVideoId`; this is metadata, not permission to play or link to video.
  Its `updatedAt` timestamp was slightly later than the request time, so it
  should not be treated as a reliable freshness guarantee.
  [Observed request](https://kitsu.io/api/edge/anime?filter%5Btext%5D=cowboy%20bebop&page%5Blimit%5D=1)
  (accessed 2026-11-14).
- **Limits/operations:** The specification does not state a quota or rate
  limit; no official status page or availability commitment was verified. Its
  versioning note says `/edge` mirrors the website API and has no guarantees.
  Confirm current support and limits with Kitsu before relying on it.
- **Freshness/rights:** No completeness or refresh SLA, duplicate-resolution
  guarantee, or license for commercial display/database storage was found.
  The linked terms page returned a JavaScript client shell, so commercial use,
  caching/storage permission, attribution requirements, and region-specific
  restrictions remain unknown. Do not treat silence as permission.
  [Terms page](https://kitsu.io/terms-of-service) (accessed 2026-11-14).

### Jikan REST API v4 (unofficial MyAnimeList data access)

- **Relationship/API:** Jikan's official OpenAPI description calls it an
  unofficial MyAnimeList API that scrapes the MyAnimeList site and says it is
  not affiliated with MyAnimeList. It exposes read-only `GET` endpoints under
  `https://api.jikan.moe/v4`, including `/anime/{id}`; responses wrap resources
  in `data`. It documents absent scalar values as `null`, absent arrays and
  objects as empty, and missing scores as `0`.
  [Jikan OpenAPI specification](https://raw.githubusercontent.com/jikan-me/jikan-rest/master/storage/api-docs/api-docs.json)
  (accessed 2026-11-14).
- **Limits/operations:** The OpenAPI specification lists 60 requests/minute
  and 3/second, with no daily limit; it warns MyAnimeList may rate-limit
  upstream. Jikan documents its own 24-hour response cache, ETag validation,
  429s, upstream errors, and intentional 503 maintenance responses. This
  describes Jikan operations, not a consumer license to store or redistribute
  the data.
- **Freshness/rights:** Jikan's cache is 24 hours, but no completeness or
  refresh SLA was verified. The OpenAPI spec links to Jikan terms, but
  `https://jikan.moe/terms` returned 404 during this review. The OpenAPI
  project's MIT license covers that software, not automatically the underlying
  MyAnimeList content. MyAnimeList's terms grant personal, non-commercial use
  and restrict copying/aggregation for use elsewhere; the precise application
  to Jikan is a legal question, but this is a material risk for a production
  catalog. Do not use Jikan for production without explicit authorization
  from the relevant rights holders.
  [MyAnimeList Terms of Use](https://myanimelist.net/about/terms_of_use)
  (accessed 2026-11-14; last updated 2026-10-16).
- **Region:** MyAnimeList's terms identify Japan/U.S. embargo and export
  restrictions and state the service operates from Japan with some data
  processing in the U.S. No comparable API-specific region matrix was verified.

## Video, region, and recommendation

None of the reviewed API documentation or terms establishes that this project
may host, embed, or link to anime video. AniList's `licensedBy` metadata and
Kitsu's `youtubeVideoId` do not establish this project's territory-specific
rights. MyAnimeList's digital-video terms are not a grant to this site.
Omit playback and watch links until the rights holder and provider terms are
verified for the launch territory and proposed use.

**Recommendation:** Do not approve a provider yet. AniList has rich discovery
fields but a current degraded quota and unresolved production data rights.
Kitsu's public read works, but quota, current stability, and reuse rights are
unknown. Jikan has the clearest operational detail but its upstream source and
MyAnimeList's terms make production use unsuitable without explicit
authorization. Decide the launch region, then obtain written data-use/storage
terms and current quota/status confirmation from any serious candidate before
selection. Do not store or expose provider credentials in the frontend.

## Handoff

- **Phase:** 2 — API and data verification
- **Agent:** ChatGPT research agent; coordinator independently reviewed key
  primary sources and repeated the Kitsu sample request.
- **Completed:** Compared AniList, Kitsu, and Jikan; distinguished documented
  facts from one live test and unknowns; assessed usage and video-rights
  evidence.
- **Files changed by researcher:** None. This report records the findings.
- **Evidence:** AniList official rate-limit warning and schema; Kitsu official
  API specification and observed response; Jikan OpenAPI specification;
  MyAnimeList terms; source links above.
- **Issues:** No candidate has verified commercial/persistent-storage
  permission. Kitsu terms/quota and current status remain unknown. AniList has
  a published degraded quota. Jikan terms link returned 404 and the upstream
  rights risk remains unresolved.
- **Remaining:** The owner selected Japan and rejected the initial three
  candidates. Evaluate alternatives for Japan, and verify production use and
  storage rights before recommending a provider.
- **Recommendation:** No provider approved; omit playback/watch links pending
  territory-specific rights verification.
-   **Status at this handoff:** Initial candidate research, Japan alternatives,
  the MAL-focused follow-up, and Wikidata follow-up verification are complete.
  Wikidata was a research candidate only; Phase 2 exit and integration were
  pending the owner's decision recorded below.

## Owner decision update

On 2026-11-14, the product owner selected Japan as the launch region and
rejected AniList, Kitsu, and Jikan as candidates. Research of alternative
metadata APIs for Japan is complete. No provider has been selected or approved,
and Phase 2 exit remains pending.

The product owner then prioritized the official MyAnimeList API v2 (not
Jikan), requested Japanese-language source data, and asked for verification of
production-use rights, persistent storage, and quota. The focused documentation
review below is complete. No provider is approved, and no external permission
request has been sent.

After reviewing that report, the owner confirmed a non-commercial MVP with no
ads or paid features, preferred direct API queries without storing the MAL
catalog, and paused MAL follow-up with no inquiry or draft requested. These
preferences do not establish permission to query or display MAL data; no
provider is approved.

The owner then clarified that no vendor is preferred and any suitable API with
no usage fee is acceptable. The research must still verify data-use rights,
Japanese-language coverage, Japan availability, and applicable quotas. MAL
follow-up remains paused; no provider has been approved.

## No-cost API alternatives

At the start of this comparison, the owner required a no-cost API and had not
selected a source. The review below separates the cost of making API requests
from the license for reusing the returned data. No provider was approved.
Sources were checked on 2026-11-14.

### Anime News Network Encyclopedia API

- **Access and shape:** ANN says its XML API is free of charge. Public report
  endpoints support `nskip`/`nlist`, and detail endpoints use
  `api.xml?anime=ID`; the docs describe an initial local title import and
  daily imports of new entries. No key or authentication is documented.
  Detail responses use `info` records with language tags; one observed record
  included Japanese titles, but not a Japanese plot summary.
  [ANN API docs](https://www.animenewsnetwork.com/encyclopedia/api.php),
  [observed detail](https://cdn.animenewsnetwork.com/encyclopedia/api.xml?anime=4658)
  (accessed 2026-11-14).
- **Limits/usage:** One request/second/IP; `nodelay` allows a limited burst
  but may return 503 when exceeded. ANN requires source credit and a link to
  the relevant Encyclopedia entry. It recommends fetching details only when
  needed and caching them for a week. The docs describe local import and
  caching, but do not clearly settle commercial rights or indefinite
  persistent storage. Images may be third-party copyrighted. Obtain
  clarification before storing or reusing more than the documented examples.
  [API terms](https://www.animenewsnetwork.com/encyclopedia/api.php),
  [copyright policy](https://www.animenewsnetwork.com/copyright-policy).
- **Japan/data fit:** No Japan-specific API restriction was found. Japanese
  title fields occur in sample data, but per-record Japanese title/summary
  completeness and availability guarantees are unknown. Search is limited and
  alternate-title matching is not documented.

### TVmaze public API

- **Access and shape:** TVmaze describes its public REST API as free and
  returns JSON. It documents public endpoints such as
  `GET /search/shows?q=...`, `GET /shows/{id}`, `/shows/{id}/akas`, and
  `GET /shows?page={n}`; no key is documented. The show index returns up to
  250 results per page. An observed One Piece search returned multiple
  adaptations, including a Japanese animated record with a Japan alias; its
  synopsis was English. This is not a completeness guarantee.
  [TVmaze API docs](https://www.tvmaze.com/api),
  [observed search](https://api.tvmaze.com/search/shows?q=one%20piece)
  (accessed 2026-11-14).
- **Limits/usage:** The docs permit at least 20 requests per 10 seconds/IP,
  warn that stricter temporary limits and 429s may occur, and describe
  60-minute response caching (up to 24 hours for the show index) and update
  feeds. Its official status page returned a loading shell without health
  details during this review.
- **Reuse/image rights:** API data is licensed CC BY-SA 4.0, permitting reuse
  with attribution and ShareAlike compliance. TVmaze says images may be
  hotlinked and stable image URLs can be cached, but that does not grant
  general rights to republish or alter third-party images. Anime/film
  completeness is unknown; TVmaze is a general TV database.
  [API license and image guidance](https://www.tvmaze.com/api),
  [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
- **Japan/data fit:** No Japan-specific API access exclusion was found.
  Japanese aliases and a Japanese-language show record exist for some entries,
  but Japanese synopsis coverage and complete anime/film coverage are not
  guaranteed.

### Wikidata Query Service

- **Access and shape:** WDQS is a public SPARQL endpoint at
  `https://query.wikidata.org/sparql`; queries can use GET and return XML by
  default or JSON using `format=json` or an Accept header. SPARQL supports
  result limits/offsets. No API key or usage fee is documented for the public
  endpoint. [WDQS overview](https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service),
  [user manual](https://www.mediawiki.org/wiki/Wikidata_Query_Service/User_Manual)
  (accessed 2026-11-14).
- **Japanese data and rights:** The label service can request labels, aliases,
  and descriptions in Japanese with language fallback; when no requested
  label exists, the entity Q-ID is returned. Availability for any given anime
  is not guaranteed. Wikidata says its structured data is CC0, allowing reuse
  and storage; linked images or other media may have separate rights.
  [Licensing](https://www.wikidata.org/wiki/Wikidata:Licensing)
  (accessed 2026-11-14).
- **Limits/operations:** No current numeric quota or production SLO was
  verified; the historical query-limits page is marked inactive and describes
  slower performance in 2026. WDQS is migrating from Blazegraph to QLever:
  the official update page says new endpoints were expected the week of
  November 16, 2026; the new service was in initial implementation/pilot
  testing with no committed SLO, and the old endpoint may degrade from
  February 2027. Wikimedia status was operational overall that day, but does
  not report WDQS endpoint health separately.
  [Migration update](https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service/WDQS_backend_update),
  [historical limits](https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service/query_limits),
  [Wikimedia status](https://www.wikimediastatus.net/) (accessed 2026-11-14).
- **Japan/data fit:** No Japan-specific access restriction was found. Wikidata
  is a community knowledge graph, not an anime catalog; coverage, consistency,
  and Japanese descriptions can be incomplete. Migration and unverified query
  limits create operational risk for live search.

### Recommendation

No-cost access alone is insufficient to approve a source. Wikidata has the
clearest reuse license and Japanese label-query mechanism, but its anime
coverage and live query service are uncertain during migration. TVmaze has a
clear reuse license but weak anime/film completeness. ANN is anime-specific
and documents attribution/import patterns, but broader storage and rights
remain unclear. Keep all three as conditional candidates; choose one only
after deciding whether its coverage, language gaps, license obligations, and
operational limits fit the MVP. MAL remains paused; AniList, Kitsu, and Jikan
remain rejected.

**Status at this review:** No-cost alternatives reviewed; no source had yet
been selected. The owner subsequently selected Wikidata Query Service for
follow-up verification only. No external inquiry has been sent, and Phase 2
exit is not approved.

## Wikidata follow-up verification

On 2026-11-14, the owner selected Wikidata Query Service (WDQS) for continued
verification. This is a candidate selection for research, not approval to
integrate or to exit Phase 2.

### Search and Japanese metadata test

- The Wikidata `wbsearchentities` Action API searches entity labels and
  aliases. Its official help documents `search`, `language`, `type`, and
  `limit` parameters; it returns matched term information and entity IDs.
  [API module documentation](https://www.wikidata.org/w/api.php?action=help&modules=wbsearchentities)
  (accessed 2026-11-14).
- Live Japanese searches for `鬼滅の刃`, `進撃の巨人`, and
  `葬送のフリーレン` returned Japanese manga and anime-TV entities; the first
  two also returned related franchise/film results. This verifies title
  matching for three examples, not catalog completeness. Results mix content
  types; the Action API search module does not provide an anime-only filter.
  Setting `language=ja` selects matches by Japanese; `uselang=ja` is also
  needed to request Japanese result labels/descriptions rather than the
  default response language.
  [API module documentation](https://www.wikidata.org/w/api.php?action=help&modules=wbsearchentities),
  [observed Japanese search](https://www.wikidata.org/w/api.php?action=wbsearchentities&search=%E9%AC%BC%E6%BB%85%E3%81%AE%E5%88%83&language=ja&uselang=ja&format=json)
  (accessed 2026-11-14).
- A live WDQS SPARQL GET query for the three anime-TV entities Q63350570,
  Q22126305, and Q115792176 returned Japanese labels and descriptions.
  Examples include `日本のアニメーション作品` and
  `日本のテレビアニメシリーズ`; these are generic classifications, not
  plot synopses. A separate property check for Q63350570 found a Commons logo
  file, but image rights must be checked separately.
  [WDQS endpoint](https://query.wikidata.org/sparql),
  [sample anime entity](https://www.wikidata.org/wiki/Q63350570),
  [Attack on Titan entity](https://www.wikidata.org/wiki/Q22126305),
  [Frieren entity](https://www.wikidata.org/wiki/Q115792176) (accessed
  2026-11-14).
- Therefore, a practical search flow would use the Wikidata Action API to
  resolve Japanese input to entity IDs and WDQS to retrieve selected
  structured fields. This is two APIs within Wikidata, not a full-text search
  capability of SPARQL. Coverage, ranking, title variants, and Japanese
  synopsis availability remain unverified and are not guaranteed.

### Operational and usage findings

- The public Action API requests read rights only. Wikimedia's API etiquette
  says there is no hard speed limit for read requests but asks clients to be
  considerate, make requests serially, batch where possible, cache reusable
  responses, and send an informative User-Agent. This is guidance, not a
  numeric production quota or SLA.
  [API etiquette](https://www.mediawiki.org/wiki/API:Etiquette),
  [Action API search docs](https://www.mediawiki.org/wiki/API:Search)
  (accessed 2026-11-14).
- Wikidata's developer data-access guide says its data sources are not
  guaranteed stable interfaces. WDQS is in the Blazegraph-to-QLever
  migration; official guidance says users must migrate to new endpoints, and
  the new endpoints have no committed SLO yet. The public migration page
  currently expects new endpoints during the week of November 16, 2026, while
  old endpoints may degrade from February 2027. Do not hard-code the legacy
  endpoint for a production deployment without rechecking the migration.
  [Data access guidance](https://www.wikidata.org/wiki/Wikidata:Data_access),
  [migration update](https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service/WDQS_backend_update)
  (accessed 2026-11-14).
- Structured Wikidata data is CC0. The official docs do not state a numeric
  WDQS read quota or API fee schedule; public read access is available without
  a documented key requirement, but the absence of a published fee is not a
  service guarantee. Images and linked media have separate rights.

### Assessment and gate

WDQS/Wikidata is a viable no-cost research candidate for Japanese title
lookup, and CC0 is a strong data-reuse fit. Live tests verify Japanese
search/title labels and generic descriptions for three anime-TV entities;
they do not establish broad anime-catalog coverage or Japanese synopsis
quality. Search mixes works and related entities, numeric quotas are
unverified, the data access interfaces are not guaranteed stable, and the
query service is migrating without a committed SLO for its new endpoints.

**Recommendation:** Keep the candidate conditional. Before production
integration, test representative Japanese searches and fields, confirm the
new endpoint and its operations guidance after launch, and have the owner
explicitly accept the coverage and availability trade-offs. Do not advance to
Phase 3 or begin implementation until the owner approves the source and the
Phase 2 exit.

**Status before the owner's decision below:** Wikidata was selected for
follow-up verification only; source integration and Phase 2 exit were pending.

## MAL API v2 focused follow-up

The following checks address the owner's requested priority. They establish
what current public documentation says, not a permission from MyAnimeList.
Sources were accessed on 2026-11-14.

- **Endpoint and client setup:** The official API reference identifies a beta
  version 2 REST API at `https://api.myanimelist.net/v2`. Anime search is
  `GET /anime?q=...`; details are `GET /anime/{anime_id}?fields=...`. Public
  client calls use `X-MAL-CLIENT-ID`; OAuth is separately documented for
  user-authorized features. MAL's support page says a developer must provide
  application information and obtain a client ID from the API tab in profile
  settings (MAL account required). The configuration page required login, so
  its review/approval workflow remains unknown. [API reference](https://myanimelist.net/apiconfig/references/api/v2),
  [support](https://myanimelist.net/about.php?go=support) (accessed
  2026-11-14).
- **Japanese-language fields:** The detail field list includes `title`,
  `alternative_titles`, and `synopsis`; the official documentation provides no
  response sample for these fields, no documented nested language tags or
  language selector, and no guarantee Japanese text is present. The detail
  example uses `synopsis`, not a separate `description` field. Japanese title
  and synopsis coverage are therefore **unknown**, not guaranteed. Verify
  each field with MAL or authorized testing before promising Japanese
  language data. [API reference](https://myanimelist.net/apiconfig/references/api/v2).
- **Quota and status:** No numeric per-client, per-IP, per-second, per-minute,
  or daily quota is documented. The `limit` parameter is a page-size bound,
  not a request quota. The reference lists `403` for DoS detection but does
  not define a request rate. MAL's status page reported all services online
  at 06:38 UTC on 2026-11-14; this is a point-in-time status, not an API SLA.
  [API reference](https://myanimelist.net/apiconfig/references/api/v2),
  [status](https://status.myanimelist.net/) (accessed 2026-11-14).
- **Storage and rights:** No separate API data license, cache duration,
  persistent-storage permission, redistribution permission, or commercial-use
  grant was found in the API reference. The general Terms of Use describe a
  limited personal, non-commercial license, restrict copying/distribution and
  aggregation for use elsewhere except as permitted or separately agreed, and
  reserve Company Content rights. They mention third-party apps integrating
  with MAL APIs for displaying user content but do not expressly grant those
  apps a license to republish the anime catalog. Do not infer catalog rights
  from API access or a client ID. Obtain a written agreement before
  production display, caching, or database persistence. [Terms, §§4, 5, 9](https://myanimelist.net/about/terms_of_use)
  (accessed 2026-11-14; page states last updated 2026-10-16).
- **Japan:** MAL's terms state the service is operated from Japan and discuss
  Japan/U.S. embargo and export restrictions. They do not promise API
  availability in Japan or grant project data rights. The status page does
  not provide an API-specific SLA.
- **Official clarification route:** MAL's support page directs API inquiries,
  bugs, and other API support to the [MAL API Club](https://myanimelist.net/clubs.php?cid=13727);
  customer support says it will not answer technical API questions. No
  inquiry was sent.

Before production, written clarification should cover: (1) permission for
this Japan-launched anime discovery site and any monetization; (2) storage,
cache, display, refresh, retention, deletion, and redistribution limits;
(3) required attribution, links, or separate commercial license; (4) numeric
quota, burst/concurrency limits, 403/429 behavior, and production approval;
(5) exact Japanese title/alternative-title fields and whether synopsis or
other values are available in Japanese, including completeness guarantees;
and (6) Japan availability restrictions and the client-ID approval process.
These questions are not resolved by the public docs.

## Japan alternatives follow-up

The owner asked to exclude AniList, Kitsu, and Jikan and evaluate other
sources for Japan. This follow-up reviews the official MyAnimeList API v2,
Anime News Network (ANN) Encyclopedia API, and TVmaze public API. The official
MyAnimeList API is distinct from Jikan's unofficial scraper; it is not a
reinstatement of Jikan. Evidence below was accessed on 2026-11-14. No source
is approved.

### Official MyAnimeList API v2

- **API:** Beta version 2 REST API at `https://api.myanimelist.net/v2`.
  Documented anime search is `GET /anime?q=...`; details use
  `GET /anime/{anime_id}?fields=...`. Search supports `q`, `limit` (default
  and maximum 100), `offset`, and field selection. List responses use
  `data[]` and `paging`; fields include titles, synopsis, dates, status,
  genres, episodes, studios, and statistics. [Official API reference](https://myanimelist.net/apiconfig/references/api/v2)
  (accessed 2026-11-14).
- **Authentication/limits:** Public client requests use an
  `X-MAL-CLIENT-ID`; user-list operations use OAuth. The configuration page
  required login in this review, so app registration requirements were not
  fully verified. No numeric API rate limit was documented; the reference
  lists `403` for DoS detection. MAL's status page reported all services
  online at 06:33 UTC on 2026-11-14, which is not an API-specific SLA.
  [API reference](https://myanimelist.net/apiconfig/references/api/v2),
  [API configuration](https://myanimelist.net/apiconfig),
  [status](https://status.myanimelist.net/) (accessed 2026-11-14).
- **Data/rights:** The API exposes `updated_at` and seasonal/ranking
  endpoints, but no completeness or refresh SLA was found. MAL's terms grant
  personal, non-commercial use and restrict copying and aggregation for use
  elsewhere, except as permitted by the terms or a separate agreement. The
  API reference does not grant commercial reuse or durable database storage;
  obtain written authorization covering display, storage, and the project's
  use. [MAL Terms of Use, §4](https://myanimelist.net/about/terms_of_use)
  (accessed 2026-11-14; terms last updated 2026-10-16).
- **Japan:** MAL's terms state the service is operated from Japan and discuss
  Japan/U.S. embargo and export restrictions. API availability is not
  guaranteed by region, and Japan does not resolve data-use rights.

**Assessment:** Anime-specific and officially documented, but no clear data
license or numeric quota is published. Treat as a candidate only if MAL gives
written permission for this product's commercial/persistent use.

### Anime News Network Encyclopedia API

- **API/data:** Direct XML feed. Reports use
  `reports.xml?id=155&type=anime&nskip=...&nlist=...`; details use
  `api.xml?anime=ID` or `api.xml?title=ID`. The docs support `nlist=all`,
  paged reports, detail batches up to 50 titles, and name lookup by primary
  title only. An observed detail response contained an `<ann>` root, `<anime>`
  record, language-tagged titles, genres, plot summary, dates, ratings, and
  episode elements. [ANN API docs](https://www.animenewsnetwork.com/encyclopedia/api.php),
  [observed report XML](https://www.animenewsnetwork.com/encyclopedia/reports.xml?id=155&type=anime&nskip=0&nlist=5),
  [observed detail XML](https://cdn.animenewsnetwork.com/encyclopedia/api.xml?anime=4658)
  (accessed 2026-11-14).
- **Authentication/limits:** No API key or authentication is specified.
  Reports paginate with `nskip`/`nlist`; details are recommended only as
  needed and cached for a week. ANN describes initial local catalog import
  and daily import of newly added titles. It limits requests to one per second
  per IP; `nodelay.api.xml` allows bursts of five per five seconds, with 503
  errors possible if exceeded. [ANN API docs](https://www.animenewsnetwork.com/encyclopedia/api.php)
  (accessed 2026-11-14).
- **Attribution/rights:** The API terms require crediting ANN as the data
  source and linking the relevant Encyclopedia entry on pages showing
  title/person details. The API docs describe database import and a one-week
  detail cache, but do not clearly grant commercial use or long-term storage.
  ANN's copyright policy says third-party images and some other content may
  not be reusable with ANN's permission. Obtain written confirmation for
  commercial use, durable catalog storage, descriptions, and image rights.
  [API terms](https://www.animenewsnetwork.com/encyclopedia/api.php),
  [copyright policy](https://www.animenewsnetwork.com/copyright-policy)
  (accessed 2026-11-14).
- **Japan/coverage:** No Japan-specific API access exclusion or availability
  SLA was found. ANN's country-specific fair-use discussion is not a guarantee
  of rights in Japan. Search-by-name does not match alternative titles, and
  no full-catalog completeness or correction-refresh SLA was verified.

**Assessment:** Strong anime-encyclopedia fit with documented import,
attribution, and throttling behavior. Commercial and persistent-use terms
remain insufficiently clear for production without written confirmation.

### TVmaze public API

- **API/data:** Public REST API returning JSON. Relevant endpoints include
  `GET /search/shows?q=...`, `GET /shows/{id}`, and paginated
  `GET /shows?page={num}` (up to 250 results per page). Search is fuzzy and
  returns ranked matches. An observed `one piece` search returned a live-action
  adaptation, a Japanese animated series, and other entries, demonstrating
  title collisions. [TVmaze API docs](https://www.tvmaze.com/api),
  [observed search](https://api.tvmaze.com/search/shows?q=one%20piece)
  (accessed 2026-11-14).
- **Authentication/operations:** Public endpoints are documented without
  credentials. The docs permit at least 20 requests per 10 seconds per IP and
  warn that stricter temporary limits and 429s may occur. Most responses are
  cached for 60 minutes; show-index responses for up to 24 hours; updates
  should propagate within about an hour. The status page returned a loading
  shell without health data, so current operational status was not verified.
  [TVmaze API docs](https://www.tvmaze.com/api),
  [status](https://status.tvmaze.com/) (accessed 2026-11-14).
- **License/rights:** TVmaze documents a CC BY-SA 4.0 license for API data,
  allowing any purpose with attribution and ShareAlike compliance; an
  enterprise agreement is available for a different license/SLA. It permits
  image hotlinking and says stable image URLs can be cached, but that does not
  establish rights to republish or transform third-party images. Review the
  effect of ShareAlike on the combined catalog and separately verify each
  image's rights. [TVmaze API licensing and image guidance](https://www.tvmaze.com/api)
  (accessed 2026-11-14).
- **Japan/coverage:** No Japan-specific API exclusion was found, but no
  country-specific availability guarantee was stated. TVmaze is a general TV
  database, not an anime-only catalog; anime films and total Japan-market
  coverage are unknown. Its Japanese-title/language fields are useful but do
  not guarantee Vietnamese-localized content.

**Assessment:** Clearest documented data reuse license among these three, but
anime/film coverage and third-party image rights are important limitations.
Consider only if a series-focused catalog and ShareAlike obligations fit the
product.

### Follow-up recommendation and remaining work

Keep all three as **research candidates**, not approved sources. TVmaze has
the clearest data license but a weaker fit for an anime-first catalog. ANN has
the strongest encyclopedia-specific fit but needs written commercial and
storage clarification. MAL is anime-specific but also needs written data-use
permission and has no documented numeric quota. Before selection, confirm
Japanese catalog completeness, Vietnamese/Japanese title coverage, image
rights, operational expectations, and permitted retention/display for the
chosen source. Video/watch links remain out unless separately authorized for
Japan.

**Owner decision (2026-11-14):** The owner approved Wikidata Query Service
plus the Wikidata `wbsearchentities` Action API as the metadata source and
approved the Phase 2 exit, accepting the reported coverage and operational
limitations. Live samples verified Japanese title search and generic
metadata for three anime-TV entities; catalog completeness, numeric query
limits, and production SLO remain unverified, and WDQS is migrating. MAL
remains paused. This approval does not grant video or third-party image
rights. At the time of this decision, Phase 3 had not yet been authorized;
the owner separately authorized design work later on 2026-11-14.

## Phase 3 follow-up: anime-film, genre, and year fields

On 2026-11-15 the owner requested an expanded catalog scope with anime films
and filters for genre and year. These checks support a design proposal; they
do not establish complete Wikidata coverage or production reliability.

- Japanese `wbsearchentities` searches for `君の名は。`, `劇場版 呪術廻戦 0`,
  and `鬼滅の刃 無限列車編` returned film entities Q21697406, Q109914608,
  and Q96376192 respectively. As with earlier queries, a title may return
  related or non-anime records; type qualification is required.
- A live `wbgetentities` claims read showed `P31` (`instance of`) value
  Q20650540 (anime film) for all three film samples. The two verified TV
  samples, Q22126305 and Q115792176, have `P31` value Q63952888 (anime
  television series). These exact classes are evidence-backed allowlist
  candidates, not a complete taxonomy. Unsupported, missing, or ambiguous
  types must remain excluded until reviewed.
- The same sample read returned `P136` (`genre`) statements for all five
  entities. Genre statements are heterogeneous: observed examples include
  film genres and anime/manga genres; sampled genre entities use `P31`
  film-genre class Q201658 or anime/manga-genre class Q4178140. Some lacked
  Japanese labels, and one entity also carried the anime-film class as a
  genre value. Do not expose every `P136` value as a clean user-facing genre.
  Filter values need type validation/curation, Japanese-label handling, and
  deduplication; coverage remains incomplete and varies by entity.
- Date statements differ by work type. TV examples had `P580` (start time)
  values in 2013 and 2023. Film examples had multiple `P577` (publication
  date) values for different release places; three Japanese premiere
  statements were observed with `P291` place-of-publication qualifier
  Q17 (Japan): 2016-08-26 for Q21697406, 2021-12-24 for Q109914608, and
  2020-10-16 for Q96376192. Using an unqualified/minimum `P577` date would
  conflate releases in different places. For a Japan-oriented year filter,
  use TV `P580` start year and film `P577` statements explicitly qualified
  with `P291=Q17`; if absent or insufficiently precise, the year is unknown
  and the item cannot match a year filter.

Primary data references: Wikidata property pages for
[instance of (P31)](https://www.wikidata.org/wiki/Property:P31),
[genre (P136)](https://www.wikidata.org/wiki/Property:P136),
[publication date (P577)](https://www.wikidata.org/wiki/Property:P577),
[start time (P580)](https://www.wikidata.org/wiki/Property:P580), and
[place of publication (P291)](https://www.wikidata.org/wiki/Property:P291);
live example entities [Your Name](https://www.wikidata.org/wiki/Q21697406),
[Jujutsu Kaisen 0](https://www.wikidata.org/wiki/Q109914608),
[Mugen Train](https://www.wikidata.org/wiki/Q96376192),
[Attack on Titan TV](https://www.wikidata.org/wiki/Q22126305), and
[Frieren TV](https://www.wikidata.org/wiki/Q115792176). Accessed 2026-11-15.

**Design implication:** The catalog proposal can include the two validated
exact content classes, `anime_tv` and `anime_film`, and `year` filtering with
type-specific semantics above. Genre filtering should use only curated
`P136` entities verified as genre categories with a Japanese label; expose
the filter option list only from verified facets and do not imply that
unlisted genres are absent. Exact facet-query strategy and acceptable
coverage should be reviewed before implementation. This follow-up does not
change the owner's existing Wikidata approval or the Phase 2 exit.
