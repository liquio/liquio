# id-api

Identity provider — accounts, authentication, sessions. Issues the tokens
that every other API in the platform verifies. See the full system context
in [ARCHITECTURE.md](../../ARCHITECTURE.md).

## Development

```bash
npm install

# run against TypeScript sources
npm start

# run compiled build
npm run build && npm run start:prod

# lint
npm run lint
npm run lint:fix

# tests
npm test
npm run test:coverage
npm run test:e2e

# database migrations
npm run migration-up
npm run migration-create --name <name>
npm run migration-down
```

## Service dependencies

From the [C4 diagram](../../ARCHITECTURE.md#c4-container-diagram):

- `id-front` → `id-api` (login UI calls this service)
- `admin-api`, `cabinet-api`, `task`, `event` → `id-api` (verify auth tokens)
- `id-api` → `sign-tool` (uses signature operations)
- `id-api` → `notification` (sends notifications)
- `notification` → `id-api` (looks up users)
- `id-api` → PostgreSQL (`id` database), Redis/Dragonfly
