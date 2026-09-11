# cabinet-front

User-facing personal cabinet single-page app for citizens' and businesses'
own submissions. See the full system context in
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

# formatting
npm run format
```

## Service dependencies

From the [C4 diagram](../../ARCHITECTURE.md#c4-container-diagram):

- User → `cabinet-front`
- `cabinet-front` → `cabinet-api` (calls, HTTPS/REST)
