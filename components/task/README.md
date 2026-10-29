# task

Core business-logic engine: runs BPMN task instances, forms, signing, and
register/document integration. The backend that `admin-api` and
`cabinet-api` proxy user requests to. See the full system context in
[ARCHITECTURE.md](../../ARCHITECTURE.md).

## Development

```bash
npm install

# run against TypeScript sources
npm run start:ts

# run compiled build
npm run build && npm start

# lint (includes a type-check pass)
npm run lint
npm run lint:fix

# tests
npm test
npm run test:watch
npm run test:cov

# database migrations
npm run migration-up
npm run migration-clear

# install/refresh plugins
npm run plugin-installer
```

## E2E infrastructure

`npm run test:e2e` (`jest.e2e.config.js`) runs `tests/**/*.e2e-spec.ts` against the real app and enforces coverage of at least 80% statements and lines. Docker is required: Postgres, Redis and RabbitMQ are started through testcontainers. Postgres can instead be an external database when `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` and `DB_NAME` are set. Downstream services (id-api, register, filestorage, sign-tool, notifier, payment, KYC, external reader) are mocked with `nock` or replaced by spies. Command-line scripts (`src/commands`) and `src/index.ts` are not counted. Use `--runInBand --forceExit` for a stable run.

## Service dependencies

From the [C4 diagram](../../ARCHITECTURE.md#c4-container-diagram):

- `admin-api` → `task` (calls specific routes)
- `cabinet-api` → `task` (proxies wholesale)
- `event` → `task` (triggers workflows)
- `task` → `id-api` (verifies auth)
- `task` → `sign-tool` (signs documents)
- `task` → `filestorage` (stores files)
- `task` → `register` (reads/writes records)
- `task` → `notification` (sends)
- `task` → `pdf-generator` (renders PDFs)
- `task` → `persist-link` (creates links)
- `task` → `external-reader` (reads external data)
- `task` → RabbitMQ (publishes/consumes BPMN messages)
- `task` → PostgreSQL (`bpmn` database, shared with `admin-api`,
  `cabinet-api`, `manager`, `gateway`, `event`)

## Cross-service ping and the manager monitoring token

The manager `/test/ping` and `/monitors/system` routes return 403 unless the
`x-monitoring-token` header matches manager `server.monitoring.token` and
`server.monitoring.isEnabled` is `true`. To let this service ping the manager
(service-wide ping / health check), enable monitoring on the manager and set
`ping.manager.monitoringToken` in `ping.json` to the same token. When
`monitoringToken` is empty the header is not sent.
