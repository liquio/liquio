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

## Service dependencies

From the [C4 diagram](../../ARCHITECTURE.md#c4-container-diagram):

- `cabinet-front` → `cabinet-api` (calls, HTTPS/REST)
- `cabinet-api` → `id-api` (verifies auth)
- `cabinet-api` → `task` (proxies everything not served locally via `discovery.mainProxy`, except a built-in deny-list of
  internal paths that return 404: `/external_services`, `/external-services`, `/test`, `/auth/bearer`,
  `/external_reader/mocks-keys-by-user`; extend it with `discovery.mainProxyDenyPaths`, or restrict the proxy to
  listed prefixes with the optional `discovery.mainProxyAllowPaths`, where `:param` segments match any one segment)
- `cabinet-api` → PostgreSQL (`bpmn` database, shared with `admin-api`,
  `task`, `manager`, `gateway`, `event`), Redis/Dragonfly
