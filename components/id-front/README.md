# id-front

Login / identity single-page app. Every user authenticates here before
reaching `cabinet-front` or `admin-front`. See the full system context in
[ARCHITECTURE.md](../../ARCHITECTURE.md).

## Development

```bash
npm install

# dev server (Vite, http://localhost:5173)
npm start

# production build (Vite, emits build/)
npm run build

# serve the production build locally
npm run preview

# lint (TS/TSX; a stray JS/JSX file in src is linted too), and the type-aware lint config for TS files
npm run lint
npm run lint:fix
npm run lint:types

# type check (tsc --noEmit; the whole source is TypeScript)
npm run typecheck

# unit tests (Vitest + Testing Library, files named *.vitest.ts / *.vitest.tsx)
npm test
npm run test:watch
```

## Service dependencies

From the [C4 diagram](../../ARCHITECTURE.md#c4-container-diagram):

- User → `id-front` (logs in via this UI)
- `id-front` → `id-api` (calls, HTTPS/REST)
