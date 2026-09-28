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
