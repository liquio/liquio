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
  reachable only from in-cluster services. In `compose.yaml` the port is
  published on loopback only (`127.0.0.1:${SVC_FILESTORAGE_PORT}:8080`);
  other services reach it over the compose network (`http://filestorage:8080`).
- **No object-level authorization.** Authentication (Basic / token, see the
  `tokens` list in the auth config) only identifies the caller. Any valid
  token gives full read, update, delete, copy and zip access to every file,
  signature and container by ID.
- **One token per calling service.** Issue a distinct token (and `user`) to
  each client so access can be revoked and attributed individually.
- **No default tokens.** The shipped `auth.json` has an empty `tokens` list and
  the service exits at startup (`config-validation-error`) if `tokens` is
  empty, malformed (must be `Basic base64(user:password)`) or one of the
  publicly known tokens previously committed to the repository. Generate
  tokens with `scripts/init.sh` (Docker Compose) or the helm `init-secrets`
  job. Helm upgrade note: releases created before this change hold a
  `filestorage` secret with `auth.json = {"token": ...}`, which the service
  ignores; delete that secret and re-run the init job (or set `tokens`
  via `config.filestorage.auth`) and restart filestorage.
- **Rotate on compromise.** If a token leaks, replace it in the config and
  redeploy filestorage and the affected caller.
- **Transport (no in-process TLS).** The HTTP listener (`server.hostname`
  `0.0.0.0` inside the container/pod, port `server.port`) is plain HTTP by
  design and is not meant to cross hosts. Docker Compose publishes it on
  loopback only; helm keeps it cluster-internal behind the `backendInternal`
  network policy. If a caller must reach it across hosts or untrusted
  networks, terminate TLS in front of it (ingress, service mesh or reverse
  proxy) and keep the listener itself unreachable from outside.
- **Preview service.** Files are POSTed to `preview.server` for thumbnails.
  It is disabled by default (`"server": ""` in the template and in helm):
  no preview is generated, uploads still succeed and the health check reports
  the preview service as not OK. To enable it set `preview.server`
  (helm: `config.filestorage.preview.server`), preferably an `https://` URL
  (certificates are verified; see `preview.tls`) or an internal address.
  Startup logs `preview-server-insecure-http` for `http://` to a
  non-internal host (not loopback, a single-label/compose name, `.svc`,
  `.local`, `.internal`).
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

`GET /files/:ids/zip` and `POST /files/asice` (`filesIds` array) collapse duplicate
IDs, require UUIDs (`400` otherwise) and accept at most `server.archive.maxZipFiles`
unique IDs (default 100, `400` above). The summed size of the files put into the
archive is capped by `server.archive.maxZipBytes` (default 2 x `maxUploadSize`);
larger archives get `413`.

## Archive entry names and signatures

Every ZIP / ASiC-E / ASiC-S entry name built from a stored file name is reduced
to its last path segment (`/` and `\` are separators, control characters are
removed, `.`/`..`/empty become `file`), so generated archives never contain
`..` or path separators. The same is applied to names at `POST /files` and to
`uploadArchive` entries.

`POST /files/asics` (and `/files/asice`) package the stored signature as is.
filestorage does **not** verify it against the file or the signer; verification
belongs to the sign-tool / task layer. `POST /files/asics` responds with
`X-Signature-Verified: false`; do not treat the container as proof of a valid
signature without verifying it first.
