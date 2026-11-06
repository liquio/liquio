# Liquio Architecture

Liquio is a microservices platform. Each deployable unit lives under
[`components/`](components/) and is packaged by the umbrella
[Helm chart](helm-chart/). Shared code (not independently deployed) lives
under `packages/`.

## Deployment model

Liquio is designed to run on **Kubernetes** (see [CONTRIBUTING.md § Kubernetes Setup](CONTRIBUTING.md#kubernetes-setup)),
deployed via the umbrella [Helm chart](helm-chart/) described throughout
this document (ingress, network policies, per-service toggles, data-layer
configuration). For **local development**, the same set of services is
brought up with [`compose.yaml`](compose.yaml) — see
[CONTRIBUTING.md § Docker Compose Setup](CONTRIBUTING.md#docker-compose-setup) —
which wires up the equivalent Postgres/RabbitMQ/Redis dependencies without
Kubernetes. The two are kept in sync but are not identical — e.g.
Kubernetes-only concerns like Ingress hostnames and NetworkPolicy tiers
have no Docker Compose equivalent.

## Services

| Service | Role |
|---|---|
| `id-api` / `id-front` | Identity provider — accounts, auth, sessions; issues tokens used by every other API |
| `admin-api` / `admin-front` | Back-office: workflow (BPMN) designer, user/register management, stats, config |
| `cabinet-api` / `cabinet-front` | Citizen/business "personal cabinet" — thin auth layer that mostly proxies to `task` |
| `task` | Core business-logic engine: runs BPMN task instances, forms, signing, register/document integration |
| `manager` | BPMN orchestration hub — routes workflow messages between `task`, `event`, `gateway` over RabbitMQ |
| `gateway` | BPMN gateway node processor — evaluates parallel/exclusive gateway logic within workflow execution, driven off RabbitMQ |
| `event` | Event/integration engine: external callbacks, X-Road gov data exchange, delayed jobs |
| `register` | Registry / reference-data storage (structured records, search, import-export) |
| `notification` | Notification dispatch (email/SMS/push) and templates |
| `sign-tool` | Digital signature / cryptographic (x509) operations |
| `pdf-generator` | HTML → PDF rendering |
| `filestorage` | File upload/storage, backed by Postgres **or** S3-compatible object storage (see below) |
| `persist-link` | Persistent/shareable document links |
| `external-reader` | Plugin-based reader/aggregator for external systems and registries, reached directly or via X-Road |

## Externally exposed services

A single umbrella Ingress ([`helm-chart/templates/shared/ingress.yaml`](helm-chart/templates/shared/ingress.yaml),
driven by `values.yaml: ingress.hosts`) exposes only the user-facing
front/API pairs:

- `id.liquio.local` → `id-front`, `id-api.liquio.local` → `id-api`
- `admin.liquio.local` → `admin-front`, `admin-api.liquio.local` → `admin-api`
- `cabinet.liquio.local` → `cabinet-front`, `cabinet-api.liquio.local` → `cabinet-api`
- `plink.liquio.local` → `persist-link`

Everything else (`task`, `manager`, `gateway`, `event`, `register`,
`notification`, `sign-tool`, `pdf-generator`, `filestorage`,
`external-reader`) is ClusterIP-only and reachable exclusively from other
services inside the cluster. Network policies in the chart
(`values.yaml: networkPolicy`, `helm-chart/templates/shared/networkpolicy.tpl`)
enforce this in four tiers: `frontend` (ingress-only), `backend` (ingress +
intra-namespace), `infra`, and a `gateway` tier applied specifically to the
`gateway` component, granting it egress to all backend-tier pods — a
network-policy allowance, not evidence that `gateway` actually calls every
backend service (see its real role below).

> Note: the ingress `serviceMap` only names ports for the six
> front/API pairs above; the `plink` host resolves against a service name
> that doesn't match the real `persist-link` Service object
> (`helm-chart/templates/core-services/persist-link.service.yaml`) unless
> overridden — worth reconciling if that route is relied on.

## Data layer

Shared infrastructure, each independently toggleable in the chart
(`values.yaml`: `postgresql.enabled`, `rabbitmq.enabled`, `redis.enabled`)
so a deployment can point at externally managed instances instead:

- **PostgreSQL** — primary datastore for nearly every service, one
  Postgres instance hosting several databases (`config-templates/*/db.json`,
  migration jobs on deploy). Most databases are one-per-service (`id`,
  `register`, `notify`, `filestorage`, `persist_link`), but `admin-api`,
  `cabinet-api`, `task`, `manager`, `gateway`, and `event` all share a
  single `bpmn` database.
- **RabbitMQ** — the BPMN workflow message bus, not generic pub/sub. Fixed
  queues (`bpmn-manager-incoming`, `bpmn-task-incoming`,
  `bpmn-event-incoming`, `bpmn-gateway-incoming`) are consumed/produced by
  `manager`, `task`, `event`, `gateway`, and `admin-api`, with `manager` as
  the sole consumer of `bpmn-manager-incoming` and fan-out point to the
  others.
- **Redis / Dragonfly** — caching/session store for `id-api`, `admin-api`,
  `cabinet-api`, `manager`, `event`, `gateway` (disabled by default for
  `task` and `register`). The chart ships a vanilla `redis` image, but
  production deployments have been observed running **Dragonfly** as a
  Redis-protocol-compatible drop-in — treat "Redis" here as "Redis wire
  protocol", not a specific engine.

### `filestorage`: dual storage backend

`filestorage` can store file bytes directly in Postgres (`data`/`preview`
`BYTEA` columns) or delegate to an S3-like object store, selected by a
single config flag rather than per file:

- `providers.json: activeProvider = null` → store in Postgres.
- `activeProvider = "minio"` → MinIO / any S3-compatible endpoint
  (bucket + credentials).
- `activeProvider = "openstack"` → OpenStack Swift object store
  (auth v3, tenant, container, credentials).

## `admin-api` / `cabinet-api` as proxies to `task`

Both are user-facing APIs that sit in front of the `task` service, but
proxy differently:

- **`cabinet-api`** is mostly a thin auth gateway: anything not matched by
  its own routes is forwarded wholesale via `express-http-proxy` to
  `discovery.mainProxy` (`http://task:8080`,
  `config-templates/cabinet-api/discovery.json`). It also supports a
  configurable list of additional proxy targets (`discovery.customApis`).
- **`admin-api`** proxies selectively: a `TaskService` client
  (`components/admin-api/src/services/task.ts`) calls specific `task`
  routes (`/workflow-logs`, `/workflows/elastic-filtered`, `/unit-access`,
  `/register/cache`, `/test/ping[/services]`), plus a dedicated
  `/register-proxy/admin` route to `register`
  (`components/admin-api/src/services/router.ts`), and a generic
  configurable reverse proxy (`config-templates/admin-api/proxy.json`).

`register` itself has no ingress and is never called directly by citizens
or businesses. Its record-management methods are exposed externally
through `task`: `task` implements its own `/register/...` REST endpoints
(`components/task/src/controllers/register.ts`) whose handlers call out to
the internal `register` service (`components/task/src/services/register.ts`,
`config-templates/task/register.json` → `http://register:8080`). Since
`cabinet-api` proxies unmatched requests wholesale to `task`, citizens and
businesses reach register data via the chain
`cabinet-api → task → register`, not by calling `register` directly. This
indirection exists so that `task` — which knows the requesting user's
unit/role and the current BPMN process/workflow context — can resolve and
enforce user- and process-level access permissions (per-unit
allow-read/create/update/delete/history rules,
`config-templates/task/register.json: access`) before the request reaches
`register`; `task` attaches the resolved `access-info` to every call
(`components/task/src/services/register.ts`). `register` has no visibility
into workflow context on its own, so it cannot enforce these permissions
itself.

## Cross-service connections

Derived from per-service config templates (`config-templates/*/*.json`) and
service/router source. Synchronous HTTP unless noted.

- `admin-front` → `admin-api`, `cabinet-front` → `cabinet-api`,
  `id-front` → `id-api` (browser-facing, via ingress)
- `admin-api` → `id-api` (auth), `notification`, `register` (+ dedicated
  proxy route), `task` (see above), `filestorage`, `sign-tool`
- `cabinet-api` → `id-api` (auth), `task` (catch-all proxy)
- `task` → `id-api`, `sign-tool`, `external-reader`, `notification`,
  `pdf-generator`, `persist-link`, `filestorage`, `register`; health-checks
  fan out to nearly every other service (`config-templates/task/ping.json`)
- `id-api` → `sign-tool`, `notification`
- `notification` → `id-api`
- `register` → `sign-tool`
- `event` → `task`, `filestorage`, `persist-link`, `notification`,
  `register`, `id-api`, `sign-tool`, **X-Road** (external gov
  data-exchange integration), and external third-party APIs directly
- `external-reader` → external APIs / registries, either directly or via
  **X-Road**
- `filestorage` → external object storage (MinIO / OpenStack), when enabled
- RabbitMQ (async, BPMN bus): `admin-api`, `manager`, `task`, `event`,
  `gateway` all publish/consume `bpmn-*-incoming` queues, with `manager` as
  the central router
- `admin-api` → `admin-front`: an authenticated WebSocket debug-log
  stream (`/ws/ws` in `components/admin-api/src/services/router.ts`) — not a
  general-purpose push channel

## C4 container diagram

```mermaid
C4Container
    title Liquio — Container Diagram

    UpdateLayoutConfig($c4ShapeInRow="4", $c4BoundaryInRow="3")

    Person(citizen, "Citizen / Business user")
    Person(official, "Government official")
    Person(admin, "Platform administrator")

    Enterprise_Boundary(liquio, "Liquio Platform") {
        Container_Boundary(entry, "Public applications — Ingress") {
            Container_Boundary(cabinet_app, "Personal cabinet") {
                Container(cabinet_front, "cabinet-front", "SPA", "Personal cabinet UI")
                Container(cabinet_api, "cabinet-api", "Node.js", "Citizen API / task proxy")
            }
            Container_Boundary(admin_app, "Administration") {
                Container(admin_front, "admin-front", "SPA", "Back-office UI")
                Container(admin_api, "admin-api", "Node.js", "Back-office API")
            }
            Container_Boundary(identity_app, "Identity") {
                Container(id_front, "id-front", "SPA", "Authentication UI")
                Container(id_api, "id-api", "Node.js", "Identity provider")
            }
        }

        Container_Boundary(internal, "Internal services — ClusterIP") {
            Container_Boundary(bpmn, "BPMN execution") {
                Container(task, "task", "Node.js", "Workflow / business logic")
                Container(manager, "manager", "Node.js", "BPMN orchestration")
                Container(gateway, "gateway", "Node.js", "Gateway processor")
                Container(event, "event", "Node.js", "Events / integrations")
            }
            Container_Boundary(domain_services, "Supporting services") {
                Container(register, "register", "Node.js", "Records / reference data")
                Container(notification, "notification", "Node.js", "Notifications")
                Container(sign_tool, "sign-tool", "NestJS", "Digital signatures")
                Container(pdf_generator, "pdf-generator", "NestJS", "PDF rendering")
                Container(filestorage, "filestorage", "Node.js", "File storage")
                Container(external_reader, "external-reader", "Node.js", "External data reader")
            }
        }

        Container_Boundary(public_links, "Public document links — Ingress") {
            Container(persist_link, "persist-link", "Node.js", "Shareable document links")
        }

        Container_Boundary(data, "Shared infrastructure") {
            ContainerQueue(rabbitmq, "RabbitMQ", "AMQP", "BPMN queues")
            ContainerDb(postgres, "PostgreSQL", "SQL", "Service databases + shared BPMN DB")
            ContainerDb(redis, "Redis / Dragonfly", "Redis protocol", "Cache / sessions")
        }
    }

    System_Ext(xroad, "X-Road", "Government data exchange")
    System_Ext(external_apis, "External APIs / registries", "Third-party systems")
    System_Ext(objectstore, "MinIO / OpenStack", "Optional object storage")

    %% User access (upper layer)
    Rel_D(citizen, cabinet_front, "Uses", "HTTPS")
    Rel_D(citizen, id_front, "Logs in", "HTTPS")
    Rel_D(official, cabinet_front, "Uses", "HTTPS")
    Rel_D(official, admin_front, "Optional access", "HTTPS")
    Rel_D(official, id_front, "Logs in", "HTTPS")
    Rel_D(admin, admin_front, "Uses", "HTTPS")
    Rel_D(admin, id_front, "Logs in", "HTTPS")

    %% Frontend / API pairs
    Rel_D(cabinet_front, cabinet_api, "REST", "HTTPS")
    Rel_D(admin_front, admin_api, "REST", "HTTPS")
    Rel_D(id_front, id_api, "REST", "HTTPS")
    Rel_U(admin_api, admin_front, "Debug logs (opt-in)", "WebSocket")

    %% Public API to core
    Rel_D(admin_api, task, "Selected routes", "HTTP")
    Rel_D(cabinet_api, task, "Catch-all proxy", "HTTP")
    Rel_R(admin_api, id_api, "Auth", "HTTP")
    Rel_R(cabinet_api, id_api, "Auth", "HTTP")

    %% HTTP service dependencies: all original edges retained
    Rel_D(admin_api, register, "Proxy", "HTTP")
    Rel_D(admin_api, notification, "Sends", "HTTP")
    Rel_D(admin_api, filestorage, "Files", "HTTP")
    Rel_D(admin_api, sign_tool, "Signing", "HTTP")
    Rel_U(task, id_api, "Auth", "HTTP")
    Rel_D(task, sign_tool, "Signs", "HTTP")
    Rel_D(task, filestorage, "Files", "HTTP")
    Rel_D(task, register, "Records", "HTTP")
    Rel_D(task, notification, "Sends", "HTTP")
    Rel_D(task, pdf_generator, "PDFs", "HTTP")
    Rel_R(task, persist_link, "Links", "HTTP")
    Rel_D(task, external_reader, "External data", "HTTP")
    Rel_D(id_api, sign_tool, "Signing", "HTTP")
    Rel_D(id_api, notification, "Sends", "HTTP")
    Rel_U(notification, id_api, "Users", "HTTP")
    Rel_R(register, sign_tool, "Signs", "HTTP")
    Rel_U(event, task, "Triggers", "HTTP")
    Rel_D(event, filestorage, "Files", "HTTP")
    Rel_R(event, persist_link, "Links", "HTTP")
    Rel_D(event, notification, "Sends", "HTTP")
    Rel_D(event, register, "Records", "HTTP")
    Rel_U(event, id_api, "Identity", "HTTP")
    Rel_D(event, sign_tool, "Signing", "HTTP")
    Rel_R(event, xroad, "Gov data", "SOAP/X-Road")
    Rel_R(event, external_apis, "Integrations", "HTTP/SOAP")
    Rel_R(external_reader, external_apis, "Reads", "HTTP/SOAP")
    Rel_R(external_reader, xroad, "Reads", "SOAP/X-Road")
    Rel_R(filestorage, objectstore, "Files (optional)", "S3 API")

    %% BPMN message bus
    Rel_D(manager, rabbitmq, "Routes", "AMQP")
    Rel_D(task, rabbitmq, "BPMN", "AMQP")
    Rel_D(event, rabbitmq, "BPMN", "AMQP")
    Rel_D(gateway, rabbitmq, "BPMN", "AMQP")
    Rel_D(admin_api, rabbitmq, "BPMN", "AMQP")

    %% Persistent storage: retain every original relationship
    Rel_D(id_api, postgres, "SQL")
    Rel_D(admin_api, postgres, "SQL")
    Rel_D(cabinet_api, postgres, "SQL")
    Rel_D(task, postgres, "SQL")
    Rel_D(manager, postgres, "SQL")
    Rel_D(register, postgres, "SQL")
    Rel_D(event, postgres, "SQL")
    Rel_D(gateway, postgres, "SQL")
    Rel_D(notification, postgres, "SQL")
    Rel_D(filestorage, postgres, "SQL (default)")
    Rel_D(persist_link, postgres, "SQL")

    %% Caching
    Rel_D(id_api, redis, "Cache")
    Rel_D(admin_api, redis, "Cache")
    Rel_D(cabinet_api, redis, "Cache")
    Rel_D(manager, redis, "Cache")
    Rel_D(event, redis, "Cache")
    Rel_D(gateway, redis, "Cache")
```

## Key files

- [`helm-chart/values.yaml`](helm-chart/values.yaml) — service list, ingress hosts, data-layer toggles
- [`helm-chart/templates/shared/ingress.yaml`](helm-chart/templates/shared/ingress.yaml) — ingress routing
- [`compose.yaml`](compose.yaml) — local dev topology
- [`config-templates/`](config-templates/) — per-service inter-service URLs (richest source for cross-service edges)
- [`components/filestorage/src/providers/`](components/filestorage/src/providers/) — DB vs. S3-compatible storage backends
- [`components/cabinet-api/src/router.ts`](components/cabinet-api/src/router.ts) — catch-all proxy to `task`
- [`components/admin-api/src/services/task.ts`](components/admin-api/src/services/task.ts) — selective proxy to `task`
