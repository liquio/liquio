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
