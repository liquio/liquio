# filestorage

File upload/storage service. Backed by PostgreSQL by default, or by an
S3-compatible object store (MinIO / OpenStack Swift), selected via a
single `activeProvider` config flag — see
[ARCHITECTURE.md § filestorage: dual storage backend](../../ARCHITECTURE.md#filestorage-dual-storage-backend).

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

# database migrations / seeds
npm run migration-up
npm run migration-clear
npm run seed-up
npm run seed-clear
```

## Service dependencies

From the [C4 diagram](../../ARCHITECTURE.md#c4-container-diagram):

- `admin-api`, `task`, `event` → `filestorage` (store/read files)
- `filestorage` → MinIO / OpenStack (stores files, when an object-storage
  provider is enabled)
- `filestorage` → PostgreSQL (`filestorage` database; default storage
  backend, and always for metadata)
