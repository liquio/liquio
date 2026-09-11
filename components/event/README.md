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
