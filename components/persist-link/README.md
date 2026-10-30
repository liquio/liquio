# persist-link

Generates and stores persistent, shareable document links. One of the few
internal services also exposed externally, via the `plink.liquio.local`
ingress host. See the full system context in
[ARCHITECTURE.md](../../ARCHITECTURE.md).

## Development

```bash
npm install

# run compiled build (npm start runs dist/index.js after npm run build)
npm run build && npm start

# run TypeScript sources
npm run start:ts

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
```

## E2E infrastructure

`npm run test:e2e` starts a Postgres container (`postgres:16`, testcontainers) per test file and applies the migrations, so Docker
must be available. Downstream services (filestorage, register, OpenStack, file converter) are local `http.createServer` stubs on
ephemeral ports (`tests/stub_server.ts`); nothing external is called. The run collects coverage over `src/**` (without the
`src/index.ts` entry) and fails below 80% statements or lines (`jest.e2e.config.js`). Use
`npm run test:e2e -- --runInBand --forceExit` as the code-quality gate does.

## OpenStack link provider

`link_providers.json` -> `openStack.serversList[]`: `server` must be an `https://host` URL, because account
credentials are posted to it. The service fails at startup otherwise. For an internal in-cluster Swift/Keystone
endpoint over plain http, set `"allowInsecure": true` on that server entry (a warning is logged at startup).
The same rule applies to the `publicURL` returned in the Keystone service catalog (the file-download
endpoint that receives `X-Auth-Token`): an http `publicURL` is refused at auth time (error logged, token not
used) unless `allowInsecure` is `true` for that server entry.
OpenStack is not enabled in the default config templates / Helm chart.

## Service dependencies

From the [C4 diagram](../../ARCHITECTURE.md#c4-container-diagram):

- `task` → `persist-link` (creates links)
- `event` → `persist-link` (uses)
- `persist-link` → PostgreSQL (`persist_link` database)
