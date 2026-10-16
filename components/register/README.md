# register

Registry / reference-data storage service: structured records, search,
import/export. See the full system context in
[ARCHITECTURE.md](../../ARCHITECTURE.md).

## Development

```bash
npm install

# run against TypeScript sources
npm run start:ts
npm run start:dev

# run compiled build
npm run build && npm start

# lint
npm run lint
npm run lint:fix

# tests
npm test
npm run test:e2e

# database migrations
npm run migration-up
npm run migration-clear
npm run migration-generate --name <name>
```

## Record security flags

`allow_see_all_records`, `disable_fields_rules` and `allow_tokens` (query/body of `GET /records`, `POST /records-by-post`, `POST /records/filter`) are honoured only for Basic users listed in `auth.trustedCallers`. For every other caller they are ignored (logged as `ignored-untrusted-security-flags`) and the effective tokens come from `auth.userAllowTokens[user]` (default `[]`). `GET /records/:id` and `GET /records/search` also use only the server-side tokens for untrusted callers. An empty or missing `trustedCallers` ignores all flags; a malformed `userAllowTokens`/`trustedCallers` fails the request with 500. Set `trustedCallers` (e.g. the task service Basic user) before deploying.

`GET /records/:id/history` and `GET /keys/:id/history` apply the key access mode, the row `allow_tokens`, column tokens and `responseFields` to every history snapshot for callers not in `auth.trustedCallers` (encrypted snapshots are returned with empty data, search strings are dropped, and `record_data_like` on a field the caller cannot read gives 403). Pages that mix keys (`GET /records`, `POST /records/filter`) check and project each record with its own key and return 403 for the whole page if any key is not readable.

For untrusted callers `GET /records/:id` also enforces key readability (`accessMode`), `auth.limitedAccess` keys, the row `allow_tokens` (403 on no overlap), then column `allowTokens` and `responseFields`; the signature is verified on the original data first and any policy error returns 500 without data. Responses of `PUT`/`PATCH /records/:id` are projected the same way. `GET /records/search` filters rows by the caller tokens before count/paging, hides fields, and returns 403 `Search field is not readable.` when the searched field (or, without `search_key`, the derived `search_string`) is hidden or partly projected; `search.<keyId>.defaultSearchKey` supplies a safe data path when the caller omits `search_key`. Trusted callers keep the previous unrestricted behaviour.

## Service dependencies

From the [C4 diagram](../../ARCHITECTURE.md#c4-container-diagram):

- `admin-api` → `register` (proxies)
- `task` → `register` (reads/writes records)
- `event` → `register` (uses)
- `register` → `sign-tool` (signs)
- `register` → PostgreSQL (`register` database)

`register` has no ingress and is never called directly by citizens or
businesses. Its record-management methods are exposed externally only
through `task`, which implements its own `/register/...` REST endpoints
(`components/task/src/controllers/register.ts`) that call out to this
service. Combined with `cabinet-api`'s wholesale proxy to `task`, external
access follows the chain `cabinet-api → task → register`. This indirection
exists so `task` can resolve and enforce user- and process-level access
permissions (per-unit allow-read/create/update/delete/history rules) before
a request reaches `register` — `register` has no visibility into the
requesting user or the BPMN workflow context on its own, so it relies on
`task` to attach that access decision to every call. See
[ARCHITECTURE.md § `admin-api` / `cabinet-api` as proxies to `task`](../../ARCHITECTURE.md#admin-api--cabinet-api-as-proxies-to-task).

## TLS to external services

Certificate verification is always on (the process no longer sets `NODE_TLS_REJECT_UNAUTHORIZED`). Defaults in `config-templates/register`
and the Helm chart point at in-cluster plain `http://` (sign tool); use `https://` for any external target.

For a private CA, either set `NODE_EXTRA_CA_CERTS=/path/to/ca.pem` for the process (all outgoing TLS), or set a per-target option
`tls = { "ca": "<PEM or path to PEM file>", "rejectUnauthorized": true }` in: `sign.json` (`tls`), the `plink` afterhandler config (`tls`),
the `elastic` afterhandler config (`options.tls`) and the blockchain provider params (`providerParams.tls`).
`rejectUnauthorized: false` is an explicit opt-out that is logged (`tls-verification-disabled`); do not use it in production.
