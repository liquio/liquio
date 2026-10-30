# persist-link

Generates and stores persistent, shareable document links. One of the few
internal services also exposed externally, via the `plink.liquio.local`
ingress host. See the full system context in
[ARCHITECTURE.md](../../ARCHITECTURE.md).

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
npm run test:watch
npm run test:cov
npm run test:e2e

# database migrations
npm run migration-up
```

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
