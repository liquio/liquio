# gateway

BPMN gateway node processor — evaluates parallel/exclusive gateway logic
within workflow execution, consuming the `bpmn-gateway-incoming` RabbitMQ
queue. Despite the name, it is not an API/WebSocket gateway. See the full
system context in [ARCHITECTURE.md](../../ARCHITECTURE.md).

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
```

## Service dependencies

From the [C4 diagram](../../ARCHITECTURE.md#c4-container-diagram):

- `gateway` → RabbitMQ (publishes/consumes BPMN gateway-node messages)
- `gateway` → PostgreSQL (`bpmn` database, shared with `admin-api`,
  `cabinet-api`, `task`, `manager`, `event`), Redis/Dragonfly
