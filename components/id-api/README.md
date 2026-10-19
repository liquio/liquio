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

## Authentication providers

- LDAP / Active Directory login, access groups and unit mapping: [docs/ldap.md](docs/ldap.md)

## Authorization code redirect URI and PKCE

Authorization codes are bound to the exact callback supplied at authorization.
Clients must send that same `redirect_uri` when exchanging a code. PKCE is
optional; when supplied, only `S256` with a 43-character base64url challenge is
accepted, and the matching `code_verifier` is required at token exchange.

Run migration `20261019000000-bind-authorization-code-redirect-pkce.js` before
starting the updated id-api. It invalidates outstanding authorization codes
because their original callback and PKCE binding cannot be recovered. Users
with an in-progress login must start again; existing access and refresh tokens
are unaffected. Configure `auth.authRedirectUrl` in task, admin-api and
cabinet-api to match the frontend callback exactly, including the path and
trailing slash. Deploy updated token clients before id-api so they send
`redirect_uri`. Test/debug codes use `oauth.defaults.redirect_uri[0]`.
