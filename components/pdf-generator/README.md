# pdf-generator

HTML → PDF rendering service (Playwright-based). See the full system
context in [ARCHITECTURE.md](../../ARCHITECTURE.md).

## Development

```bash
npm install # also runs `postinstall`: installs Playwright's Chromium + deps

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
npm run test:cov
npm run test:debug
npm run test:e2e
```

## Service dependencies

From the [C4 diagram](../../ARCHITECTURE.md#c4-container-diagram):

- `task` → `pdf-generator` (renders PDFs)

### Authentication (required)

`POST /pdf` is protected by HTTP Basic auth. `config/auth.json.default` ships with an empty `basicAuthTokens` list on purpose: the service **refuses to start** until real credentials are configured. Every token must be `Basic <base64(user:password)>` with a non-empty password, and the publicly known `username:password` pair is rejected.

Provide tokens in `config/auth.json` (`{ "basicAuthTokens": ["Basic <base64>"] }`) or via the `KITSOFT_PDF_GENERATOR_auth` environment variable (`'{"basicAuthTokens":["Basic <base64>"]}'`).

## Outbound requests

### Request size and queue limits

- `config/server.json` `bodyLimit` (default `50mb`, unchanged; lower it once the largest real template payload is known) is the JSON body limit for `POST /pdf`. It is applied only after the Basic token has been checked, so unauthenticated callers get `401` without the body being buffered.
- `config/server.json` `defaultBodyLimit` (default `100kb`) applies to every other route and to unauthenticated requests; larger bodies get `413`.
- `config/playwright.json` `maxQueueSize` (default `100`) is the number of jobs that may wait for a worker. When it is full, `POST /pdf` answers `429` with `Retry-After: 5` immediately. Worst-case memory held by the queue is roughly `maxQueueSize` times the typical HTML size.

The rendering browser may only load `data:`/`blob:`/`about:` URLs by default. All http(s) requests (images, fonts, stylesheets, redirects, iframes, popups) are blocked unless the host is listed in `allowedHosts` of `config/playwright.json` (`{ "allowedHosts": ["fonts.example.com"] }`) and resolves only to public addresses. Loopback, private, link-local (cloud metadata), CGNAT addresses and non-http(s) schemes such as `file:` are always blocked. Remote fonts used by header/footer templates are inlined server-side under the same rules.
