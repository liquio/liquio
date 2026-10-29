# admin-api

Back-office API: workflow (BPMN) designer, user/register management,
notifications config, stats, localization. Proxies selectively to `task`
(specific routes, not a catch-all like `cabinet-api`). See the full system
context in [ARCHITECTURE.md](../../ARCHITECTURE.md).

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

## E2E infrastructure

`npm run test:e2e` (`jest.e2e.config.js`) runs `tests/**/*.e2e-spec.ts` against the real app and enforces coverage of at least 80% statements and lines. Docker is required: Postgres, Redis and RabbitMQ are started through testcontainers. Postgres can instead be an external database when `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` and `DB_NAME` are set. Upstream services (id-api, register, task, notifier, filestorage, sign) are mocked with `nock`. Use `--runInBand --forceExit` for a stable run.

## Service dependencies

From the [C4 diagram](../../ARCHITECTURE.md#c4-container-diagram):

- `admin-front` → `admin-api` (calls, HTTPS/REST)
- `admin-api` → `id-api` (verifies auth)
- `admin-api` → `task` (calls specific routes: `/workflow-logs`,
  `/workflows/elastic-filtered`, `/unit-access`, `/register/cache`,
  `/test/ping[/services]`)
- `admin-api` → `register` (proxies, incl. dedicated `/register-proxy/admin`)
- `admin-api` → `notification` (sends)
- `admin-api` → `filestorage` (uses)
- `admin-api` → `sign-tool` (uses)
- `admin-api` → RabbitMQ (publishes/consumes BPMN messages)
- `admin-api` → PostgreSQL (`bpmn` database, shared with `cabinet-api`,
  `task`, `manager`, `gateway`, `event`), Redis/Dragonfly

## Secrets in config

Secrets (`notifier.password`, `server.token`, `server.crypto.password`, `server.crypto.iv`, `db.password`, `auth.jwtSecret`, `auth.basicAuthToken`) must not be left as the `<REDACTED>` placeholder from `config-templates/admin-api` or empty. Outside `server.environment: dev` the service refuses to start. Provide them via the secret config (`<release>-admin-api-secret-config`, `notifier.json` / `server.json` / `db.json` / `auth.json`); the Helm chart generates random values when `secrets.createSecrets: true`.
`auth.clientSecret` and `sign.token` only log the warning `config-placeholder-secrets-warning` when left as a placeholder.

## TLS to internal services

Calls to notification (`notifier`, `system_notifier`) and sign-tool (`sign`) can use verified HTTPS. Use `https://` URLs and the optional
`internal_transport.json` config: `ca` (PEM or path, or an array) is trusted for these calls, `cert` + `key` add a client certificate (mTLS).
Certificate verification cannot be disabled. In production (`NODE_ENV=production|prod`) a plain `http://` URL logs the warning
`internal-service-plain-http`; set `internal_transport.allowPlainHttp: true` to acknowledge it (NetworkPolicy/mesh-protected traffic).
