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

## Trust model and security

- **Internal only.** filestorage must never be exposed publicly. The helm chart
  has no ingress for it and a `backendInternal` network policy keeps it
  reachable only from in-cluster services. In `docker-compose.yml` the port is
  published on loopback only (`127.0.0.1:${SVC_FILESTORAGE_PORT}:8105`);
  other services reach it over the compose network (`http://filestorage:8105`).
- **No object-level authorization.** Authentication (Basic / token, see the
  `tokens` list in the auth config) only identifies the caller. Any valid
  token gives full read, update, delete, copy and zip access to every file,
  signature and container by ID.
- **One token per calling service.** Issue a distinct token (and `user`) to
  each client so access can be revoked and attributed individually.
- **Rotate on compromise.** If a token leaks, replace it in the config and
  redeploy filestorage and the affected caller.
- Outbound connections to the object-storage backend can optionally use a
  custom `tls` provider config (CA / client certificates).

## Upload limits

`POST /files` and `POST /files/uploadArchive` read the raw body before JSON
parsing, so `server.maxBodySize` does not apply to them. They are capped by
`server.maxUploadSize` (bytes, default 104857600 = 100 MB; helm:
`config.server.maxUploadSize`); larger bodies get `413`. `uploadArchive` also
rejects archives (413) with more than `server.archive.maxEntries` entries
(default 1000), an entry whose declared size exceeds `server.archive.maxEntrySize`
(default `maxUploadSize`), a declared total over `server.archive.maxTotalSize`
(default 2 x `maxUploadSize`), or a compression ratio above
`server.archive.maxRatio` (default 100). The `archive.*` keys are optional.
