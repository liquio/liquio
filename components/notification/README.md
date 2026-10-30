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

## Service dependencies

From the [C4 diagram](../../ARCHITECTURE.md#c4-container-diagram):

- `admin-api`, `task`, `id-api`, `event` → `notification` (send)
- `notification` → `id-api` (looks up users)
- `notification` → PostgreSQL (`notify` database)
