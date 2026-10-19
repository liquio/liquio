# sign-tool

Digital signature / cryptographic (x509) operations. See the full system
context in [ARCHITECTURE.md](../../ARCHITECTURE.md).

## Development

```bash
npm install

# dev server (watch mode)
npm run start:dev
npm run start:debug

# run compiled build
npm run build && npm run start:prod

# lint
npm run lint
npm run lint:fix

# tests
npm test
npm run test:watch
npm run test:debug
npm run test:e2e
```

## Inbound HTTPS (optional)

The HTTP listener is plain by default. To serve HTTPS (e.g. so `id-api` can call it over verified TLS), set in `server.json`:

```json
"tls": { "enabled": true, "certPath": "/certs/tls.crt", "keyPath": "/certs/tls.key", "caPath": "/certs/ca.crt" }
```

- `enabled` (default `false`): when off, behaviour is unchanged.
- `certPath` / `keyPath`: PEM server certificate and key. Unreadable or missing files abort startup.
- `caPath` (optional): PEM CA bundle. When set, mutual TLS is enforced: requests without a client certificate signed by this CA get `401`.
  `/test/ping` stays reachable without a client certificate so probes keep working (point probes at `scheme: HTTPS`).

## Service dependencies

From the [C4 diagram](../../ARCHITECTURE.md#c4-container-diagram):

- `admin-api`, `task`, `id-api`, `register`, `event` → `sign-tool` (uses /
  signs documents)
