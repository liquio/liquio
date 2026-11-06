# manager

BPMN orchestration hub — the sole consumer of the `bpmn-manager-incoming`
RabbitMQ queue, routing workflow messages between `task`, `event`, and
`gateway`. See the full system context in
[ARCHITECTURE.md](../../ARCHITECTURE.md).

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
npm run test:e2e

# database migrations
npm run migration-up
npm run migration-clear
npm run migration-generate --name <name>
```

## E2E infrastructure

`npm run test:e2e` (config: `jest.e2e.config.js`, coverage threshold 80% statements and lines) needs Docker: the
suites start PostgreSQL (`postgres:16`) and RabbitMQ (`rabbitmq:3-management`) containers through testcontainers.
To use an existing PostgreSQL instead, set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` and `DB_NAME`
(RabbitMQ is still started as a container). Downstream HTTP services are mocked with `nock`.

## Service dependencies

From the [C4 diagram](../../ARCHITECTURE.md#c4-container-diagram):

- `manager` → RabbitMQ (routes BPMN messages; consumes
  `bpmn-manager-incoming`, fans out to `task`, `event`, `gateway`)
- `manager` → PostgreSQL (`bpmn` database, shared with `admin-api`,
  `cabinet-api`, `task`, `gateway`, `event`), Redis/Dragonfly
