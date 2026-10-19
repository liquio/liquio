# cabinet-api

Citizen/business "personal cabinet" API. Mostly a thin auth gateway: any
request not matched by its own routes is forwarded wholesale to `task`.
See the full system context in [ARCHITECTURE.md](../../ARCHITECTURE.md).

## Development

```bash
npm install

# run against TypeScript sources
npm run start:ts

# run compiled build
npm run build && npm start

# lint
npm run lint
npm run lint:fix

# tests
npm test
npm run test:watch
npm run test:cov
```

## Custom API proxies

`discovery.customApis` (empty by default) exposes extra upstreams under `/custom/<apiName>`.
Entries fail closed:

- Cabinet authentication is required by default (`sendUserData: true`); set `sendUserData: false`
  explicitly for a public API (`isCheckJwtOnly: true` checks the JWT without sending user data).
- `allowedPaths` is required. An entry without it is skipped and `custom-api-invalid-config` is logged.
- A `:param` segment in a path matches exactly one path segment; other paths match exactly.
  Requests containing `%2f`, `%5c`, `%00`, a backslash or a `..` segment are rejected.

```json
{
  "customApis": [
    {
      "apiName": "example",
      "proxyTo": "https://<service-url>",
      "authHeader": "Basic <token>",
      "sendUserData": false,
      "allowedPaths": [{ "method": "GET", "path": "/items/:id" }]
    }
  ]
}
```

## Main proxy allow-list

Off by default (only the deny-list applies). `discovery.mainProxyAllowPaths` turns it on, and everything not listed then
returns 404. The deny-list still applies.

- `"default"` selects the built-in `CABINET_FRONT_PROXY_PATHS` (`src/lib/proxy_filter.ts`): the routes used by
  `cabinet-front` and `front-core`, each with the HTTP methods the front sends (for example `POST /tasks/:id/commit`,
  `GET|POST /documents/:id/pdf`), plus `GET /healthz` and the `/payment` provider callbacks (`GET|POST`). Task routes the front
  never uses (`/tasks/statistics/*`, `/tasks/list/*`, `/tasks/by-other-system`, `DELETE /tasks/expired-drafts`, ...) and the
  same path with another method (`DELETE /documents/:id/pdf`, `POST /tasks/unread/count`) return 404. Example
  `discovery.json`: `{ "mainProxy": "http://task:3000", "mainProxyAllowPaths": "default" }`. With Helm, set
  `config.cabinetApi.discovery.mainProxyAllowPaths: default` in the values.
- An array replaces the built-in list (it is not merged with it), for example `["/tasks", "/auth/me"]`. A plain string entry
  allows every method. An entry can also be an object, `{ "path": "/tasks/:id/commit$", "methods": ["POST"], "except":
  ["/tasks/expired-drafts$"] }`: `methods` limits the methods (HEAD counts as GET), `except` lists paths the pattern must
  not match.
- An empty array or no value keeps the mode off.
- Entries match on a path-segment boundary, case-insensitively. A `:param` segment matches any one segment. A trailing
  `$` means exactly that path (`/external_reader$` allows `/external_reader` but not `/external_reader/async`).
- CORS preflight (`OPTIONS`) is answered by cabinet-api's CORS middleware with 204 before the proxy, for any path, and never
  reaches `task`. If an `OPTIONS` request does reach the filter, it is allowed on every listed path whatever the methods.

Enable it only when the deployed front is the stock `cabinet-front`: a customised front, payment providers calling back
through the cabinet host, or other task routes need extra entries (use an explicit array that starts from the built-in
list). `/custom/*` routes of configured `customApis` and `/test/ping` are served by cabinet-api itself and need none.

## Service dependencies

From the [C4 diagram](../../ARCHITECTURE.md#c4-container-diagram):

- `cabinet-front` → `cabinet-api` (calls, HTTPS/REST)
- `cabinet-api` → `id-api` (verifies auth)
- `cabinet-api` → `task` (proxies everything not served locally via `discovery.mainProxy`, except a built-in deny-list of
  internal paths that return 404: `/external_services`, `/external-services`, `/test`, `/auth/bearer`,
  `/external_reader/mocks-keys-by-user`; extend it with `discovery.mainProxyDenyPaths`, or restrict the proxy to
  listed prefixes with the optional `discovery.mainProxyAllowPaths`, see below)
- `cabinet-api` → PostgreSQL (`bpmn` database, shared with `admin-api`,
  `task`, `manager`, `gateway`, `event`), Redis/Dragonfly
