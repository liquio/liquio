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

## Service dependencies

From the [C4 diagram](../../ARCHITECTURE.md#c4-container-diagram):

- `cabinet-front` → `cabinet-api` (calls, HTTPS/REST)
- `cabinet-api` → `id-api` (verifies auth)
- `cabinet-api` → `task` (proxies wholesale, `discovery.mainProxy`)
- `cabinet-api` → PostgreSQL (`bpmn` database, shared with `admin-api`,
  `task`, `manager`, `gateway`, `event`), Redis/Dragonfly
