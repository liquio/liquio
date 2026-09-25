# external-reader

Plugin-based reader/aggregator for external systems and registries,
reached either directly or via X-Road. See the full system context in
[ARCHITECTURE.md](../../ARCHITECTURE.md).

## Development

1. Install packages: `npm i`
2. Add necessary config files
3. Run the application

```bash
# development
npm run start

# watch mode
npm run start:dev

# production mode
npm run build && npm run start:prod

# lint
npm run lint
npm run lint:fix

# tests
npm test
npm run test:watch
npm run test:cov
npm run test:e2e

# install/refresh plugins
npm run plugin-installer
```

## Service dependencies

From the [C4 diagram](../../ARCHITECTURE.md#c4-container-diagram):

- `task` → `external-reader` (reads external data)
- `external-reader` → external APIs / registries (reads directly, or via
  X-Road)
