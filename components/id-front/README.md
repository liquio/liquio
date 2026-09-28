# id-front

Login / identity single-page app. Every user authenticates here before
reaching `cabinet-front` or `admin-front`. See the full system context in
[ARCHITECTURE.md](../../ARCHITECTURE.md).

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
```

## Service dependencies

From the [C4 diagram](../../ARCHITECTURE.md#c4-container-diagram):

- User → `id-front` (logs in via this UI)
- `id-front` → `id-api` (calls, HTTPS/REST)
