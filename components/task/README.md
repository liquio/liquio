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
