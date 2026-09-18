# admin-front

Admin console single-page app: BPMN workflow designer and back-office UI.
See the full system context in [ARCHITECTURE.md](../../ARCHITECTURE.md).

## Development

```bash
npm install

# dev server
npm start

# production build
npm run build

# lint
npm run lint
npm run lint:fix

# formatting
npm run format
```

## Service dependencies

From the [C4 diagram](../../ARCHITECTURE.md#c4-container-diagram):

- User → `admin-front`
- `admin-front` → `admin-api` (calls, HTTPS/REST)
- `admin-api` → `admin-front` (optional dev-only WebSocket debug-log
  stream, disabled by default)
