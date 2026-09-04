# register

Registry / reference-data storage service: structured records, search,
import/export. See the full system context in
[ARCHITECTURE.md](../../ARCHITECTURE.md).

## Development

```bash
npm install

# run against TypeScript sources
npm run start:ts
npm run start:dev

# run compiled build
npm run build && npm start

# lint
npm run lint
npm run lint:fix

# tests
npm test
npm run test:e2e

# database migrations
npm run migration-up
npm run migration-clear
npm run migration-generate --name <name>
```

## Service dependencies

From the [C4 diagram](../../ARCHITECTURE.md#c4-container-diagram):

- `admin-api` → `register` (proxies)
- `task` → `register` (reads/writes records)
- `event` → `register` (uses)
- `register` → `sign-tool` (signs)
- `register` → PostgreSQL (`register` database)

`register` has no ingress and is never called directly by citizens or
businesses. Its record-management methods are exposed externally only
through `task`, which implements its own `/register/...` REST endpoints
(`components/task/src/controllers/register.ts`) that call out to this
service. Combined with `cabinet-api`'s wholesale proxy to `task`, external
access follows the chain `cabinet-api → task → register`. This indirection
exists so `task` can resolve and enforce user- and process-level access
permissions (per-unit allow-read/create/update/delete/history rules) before
a request reaches `register` — `register` has no visibility into the
requesting user or the BPMN workflow context on its own, so it relies on
`task` to attach that access decision to every call. See
[ARCHITECTURE.md § `admin-api` / `cabinet-api` as proxies to `task`](../../ARCHITECTURE.md#admin-api--cabinet-api-as-proxies-to-task).
