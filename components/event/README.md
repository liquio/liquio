# event

Event/integration engine: external callbacks, X-Road government data
exchange, delayed jobs. See the full system context in
[ARCHITECTURE.md](../../ARCHITECTURE.md).

## Development

```bash
npm install

# run
npm start

# lint
npm run lint
npm run lint:fix

# tests
npm test
npm run test:watch
npm run test:cov
npm run test:e2e

# database migrations
npm run migration-up
npm run migration-clear

# install/refresh plugins
npm run plugin-installer
```

## E2E infrastructure

`npm run test:e2e` (`jest.e2e.config.js`) runs `tests/**/*.e2e-spec.ts` against the real app and enforces coverage of at least 80% statements and lines. Docker is required: Postgres, Redis and RabbitMQ are started through testcontainers; the message queue is real, so consumer tests publish to the reading queue and wait for the result in the database. Postgres can instead be an external database when `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` and `DB_NAME` are set. Upstream HTTP services (id-api, filestorage, sign, persist-link, registers, external services) are mocked with `nock`. Use `--runInBand --forceExit` for a stable run.

## Service dependencies

From the [C4 diagram](../../ARCHITECTURE.md#c4-container-diagram):

- `event` → `task` (triggers workflows)
- `event` → `filestorage`, `persist-link`, `notification`, `register`,
  `id-api`, `sign-tool` (uses)
- `event` → X-Road (external gov data exchange)
- `event` → external third-party APIs (calls directly)
- `event` → RabbitMQ (publishes/consumes BPMN messages)
- `event` → PostgreSQL (`bpmn` database, shared with `admin-api`,
  `cabinet-api`, `task`, `manager`, `gateway`), Redis/Dragonfly

## Cross-service ping and the manager monitoring token

The manager `/test/ping` and `/monitors/system` routes return 403 unless the
`x-monitoring-token` header matches manager `server.monitoring.token` and
`server.monitoring.isEnabled` is `true`. To let this service ping the manager
(service-wide ping / health check), enable monitoring on the manager and set
`ping.manager.monitoringToken` in `ping.json` to the same token. When
`monitoringToken` is empty the header is not sent.
