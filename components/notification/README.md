# notification

Notification dispatch (email/SMS/push) and templates. See the full system
context in [ARCHITECTURE.md](../../ARCHITECTURE.md).

## Development

```bash
npm install

# run against TypeScript sources
npm run start:ts
npm run start-dev

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
```

## TLS to external services

Certificate verification is always on (the process no longer sets `NODE_TLS_REJECT_UNAUTHORIZED`). Configure `https://` URLs for
external gateways (`smsServer.url`, `auth_server.host`, `persistLink.createLinkUrl`); the `http://` defaults are dev-only.

For a private CA, either set `NODE_EXTRA_CA_CERTS=/path/to/ca.pem` for the process (applies to every outgoing TLS connection), or
set the per-gateway option `smsServer.tls = { "ca": "<PEM or path to PEM file>", "rejectUnauthorized": true }` (SMS gateways only).
For SMTP use `smtpServer.tls`. Setting `rejectUnauthorized: false` is an explicit opt-out and should not be used in production.

## Inbound HTTPS (optional)

The HTTP listener is plain by default. To serve HTTPS (e.g. so `id-api` can call it over verified TLS), set in the environment config:

```json
"tls": { "enabled": true, "certPath": "/certs/tls.crt", "keyPath": "/certs/tls.key", "caPath": "/certs/ca.crt" }
```

- `enabled` (default `false`): when off, behaviour is unchanged.
- `certPath` / `keyPath`: PEM server certificate and key. Unreadable or missing files abort startup.
- `caPath` (optional): PEM CA bundle. When set, mutual TLS is enforced: requests without a client certificate signed by this CA get `401`.
  `/test/ping` stays reachable without a client certificate so probes keep working (point probes at `scheme: HTTPS`).

## E2E infrastructure

`npm run test:e2e` starts PostgreSQL with testcontainers (Docker required, or set `DB_HOST`, `DB_USER`, `DB_PASSWORD`,
`DB_NAME` and `DB_PORT` to use an external database). No other infrastructure is needed: id-api, E-Consulting,
persist-link, the SMS gateway and Corezoid are mocked with `nock`, and SMTP with a stubbed nodemailer transport. The app
is booted through `src/app.ts` with the adapters from `src/bootstrap.ts`, the same code path as `src/index.ts`. Coverage
of `src` (except `index.ts` and the static `src/admin` assets) is collected and a global 80% statements/lines threshold
is enforced (`jest.e2e.config.js`).

## Service dependencies

From the [C4 diagram](../../ARCHITECTURE.md#c4-container-diagram):

- `admin-api`, `task`, `id-api`, `event` → `notification` (send)
- `notification` → `id-api` (looks up users)
- `notification` → PostgreSQL (`notify` database)
