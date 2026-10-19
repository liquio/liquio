# Liquio Helm Chart

This Helm chart deploys the Liquio platform on Kubernetes.

## Prerequisites

- Kubernetes cluster (version 1.16+)
- Helm 3.0+
- PostgreSQL (can be deployed as part of this chart)
- RabbitMQ (can be deployed as part of this chart)
- Redis (can be deployed as part of this chart)

## Installation

### OCI Registry (Recommended)

Charts are published to GitHub Container Registry on every `helm-v*` tag.

```bash
# Install latest release
helm install liquio oci://ghcr.io/liquio/charts/liquio --version <version>

# Upgrade
helm upgrade liquio oci://ghcr.io/liquio/charts/liquio --version <version>

# Inspect values before installing
helm show values oci://ghcr.io/liquio/charts/liquio --version <version>
```

Replace `<version>` with a published chart version, e.g. `0.1.0`.

### From Source (Development)

### Quick Start

1. Build Docker images for all components:
   ```bash
   # Build images for each service
   docker build -t id-front:latest ./components/id-front
   docker build -t id-api:latest ./components/id-api
   docker build -t admin-front:latest ./components/admin-front
   docker build -t admin-api:latest ./components/admin-api
   docker build -t cabinet-front:latest ./components/cabinet-front
   docker build -t cabinet-api:latest ./components/cabinet-api
   docker build -t event:latest ./components/event
   docker build -t gateway:latest ./components/gateway
   docker build -t manager:latest ./components/manager
   docker build -t notification:latest ./components/notification
   docker build -t register:latest ./components/register
   docker build -t sign-tool:latest ./components/sign-tool
   docker build -t pdf-generator:latest ./components/pdf-generator
   docker build -t task:latest ./components/task
   docker build -t external-reader:latest ./components/external-reader
   docker build -t filestorage:latest ./components/filestorage
   ```

2. Install the chart:
   ```bash
   helm install liquio ./helm-chart
   ```

### Custom Installation

1. Create a custom values file:
   ```bash
   cp helm-chart/values.yaml my-values.yaml
   ```

2. Edit `my-values.yaml` to customize your deployment

3. Install with custom values:
   ```bash
   helm install liquio ./helm-chart -f my-values.yaml
   ```

## Configuration

The following table lists the configurable parameters and their default values:

### Global Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `global.imageRegistry` | Global Docker image registry | `""` |
| `global.imagePullSecrets` | Global Docker registry secret names | `[]` |

### Image Defaults And Overrides

Default image behavior is defined in chart templates (`templates/shared/_service-helpers.tpl`) so `values.yaml` stays minimal by default.

- Default registry: `ghcr.io/liquio`
- Default pull policy: `IfNotPresent`
- Default fallback tag: `0.1.0`
- Per-service default tags are defined in template helpers and used automatically.

You can still override all of these in your own values file:

```yaml
image:
  registry: registry.example.com/liquio
  pullPolicy: Always
  tag: 9.9.9

serviceVersions:
  admin-api: 0.1.777
  admin-front: 0.1.3
```

Precedence for a service tag is:

1. `serviceVersions.<component>`
2. Template-defined per-service default tag
3. `image.tag`

### Service Configuration

Each service can be individually enabled/disabled and configured:

| Parameter | Description | Default |
|-----------|-------------|---------|
| `services.<service>.enabled` | Enable/disable service | `true` |
| `services.<service>.replicaCount` | Number of replicas | `1` |
| `services.<service>.type` | Service type | `ClusterIP` |

### Database Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `postgresql.enabled` | Deploy bundled PostgreSQL (local/non-production) | `true` |
| `postgresql.auth.username` | PostgreSQL username | `postgres` |
| `postgresql.auth.password` | PostgreSQL password | `changeme` |
| `config.database.host` | External PostgreSQL host when `postgresql.enabled=false` | `liquio-test-postgresql` |
| `config.database.port` | External PostgreSQL port | `5432` |

### Message Queue Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `rabbitmq.enabled` | Deploy bundled RabbitMQ (local/non-production) | `true` |
| `rabbitmq.auth.username` | RabbitMQ username | `guest` |
| `rabbitmq.auth.password` | RabbitMQ password | `changeme` |
| `config.rabbitmq.host` | External RabbitMQ host when `rabbitmq.enabled=false` | `liquio-test-rabbitmq` |
| `config.rabbitmq.port` | External RabbitMQ port | `5672` |

### Cache Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `redis.enabled` | Deploy bundled Redis (local/non-production) | `true` |
| `redis.auth.enabled` | Enable Redis auth | `false` |
| `config.redis.host` | External Redis host when `redis.enabled=false` | `liquio-test-redis-master` |
| `config.redis.port` | External Redis port | `6379` |

### External Infrastructure (Production)

Bundled PostgreSQL, RabbitMQ, and Redis deployments are intended for local and non-production use.

For production, disable bundled infrastructure and point Liquio services to managed/external dependencies:

```yaml
postgresql:
  enabled: false

rabbitmq:
  enabled: false

redis:
  enabled: false

config:
  database:
    host: my-postgres.example.internal
    port: 5432
    username: postgres
    password: "<from-secret>"
  rabbitmq:
    host: my-rabbitmq.example.internal
    port: 5672
    username: guest
    password: "<from-secret>"
  redis:
    host: my-redis.example.internal
    port: 6379
```

### Secrets — Deploy With Your Own Secrets

The chart supports two explicit secret modes via `secrets.createSecrets`.

#### Mode A: Auto-generate (`createSecrets: true`, default)

On install, a pre-install hook Job creates all required secrets:

- `<release>-infra-secrets` (internal: PostgreSQL and RabbitMQ passwords)
- `<release>-ca-certs` (self-signed CA key/cert for sign-tool)
- `<release>-<service>-secret-config` for each backend service

The hook runs on `pre-install` only. Upgrades do not rotate or recreate secrets.

A separate `pre-upgrade` hook only adds what older releases lack, and never overwrites existing values:

- the task Basic token (`basic_auth.json` in the task Secret and `task.json` in the admin-api Secret);
- the Basic token of user `event` (added to `tokens` in the task `basic_auth.json`, and written as `test.token` in the event `external_bpmn.json`), so `event` has its own task user next to `admin-api`. Skipped when the event Secret already has an `external_bpmn.json`; task and event are restarted when it is added. To scope task Basic routes per caller, set `config.task.basic_auth.scopedRoutes: true`. The chart ships rules for `admin-api` and `event`; a caller without a rule gets 403, so first check out-of-chart `external_bpmn` systems and any other Basic caller;
- the named id-api clients `task`, `cabinet-api`, `event`, `notification` and `admin-api` (scopes: see [Named id-api clients](#named-id-api-clients)). A client is added only when `production.basic_auth.clients` in the id Secret has no entry with that name. The hook generates its secret, writes the caller's token (`LiquioId.basicAuthToken` in the task and cabinet-api `auth.json` and in the event `user.json`, `production.auth_server.basicAuthToken` in the notification `config.json`, `basicAuthToken` in the admin-api `auth.json`), then adds the hash to the id Secret. If anything was added, it restarts id-api (and waits for it) and then the five callers, because they read secrets at startup. Re-running changes nothing.

- the shipped default register and filestorage Basic tokens (SE-3930 KS-09b). A token is replaced only when its SHA-256 equals a known shipped default: a default in the register Secret's `auth.json` `tokens`, or in a caller (`register.json` `token` in the admin-api and task Secrets, `requester.json` `registers.token` in the event Secret). The hook adds a new generated token to the callee, moves the callers that held a default, and then removes the default from the callee, so both sides change together; the same for filestorage (`auth.json` `tokens`; callers: `filestorage.json` in admin-api, task and event, `storage.json` `FileStorage.token` in task). Operator-set tokens are never touched. The hook also fills filestorage `tokens` from the token the callers already use when a release only has the old `token` key, because filestorage refuses to start with no tokens. register, filestorage, admin-api, task and event are restarted only when something changed. Re-running changes nothing. With `createSecrets: false`, check that none of your tokens equals the old shipped defaults (`register:OaUiZ70kuHLj`, `test1:test`, `test2:...`);

- the notification admin password (SE-3930 NT-21). Releases from before it moved to the Secret have the shipped default in the notification ConfigMap and no `production.adminConfig.password` in the Secret. The hook copies that default into the Secret, only when it equals the shipped default by SHA-256, so the operator's admin login keeps working: it is **not rotated**. notification logs the warning `admin-default-password-warning` at every start while the default is in use (it never refuses to start). Set a new password as described under [Notification admin password](#notification-admin-password) and restart notification. Re-running changes nothing;

- a monitoring token for manager, gateway and event (see [Monitoring](#monitoring)): `server.json` (`monitoring.isEnabled`, `monitoring.token`) in each Secret, manager's token as `ping.json` `manager.monitoringToken` in the event Secret, and manager's and gateway's tokens in the task Secret's `ping.json`. Only where no token is set; an existing token or `isEnabled` is never changed. The hook also creates or completes the `<release>-monitoring-tokens` Secret. The Deployments concerned (including task) are restarted when something was added. Re-running changes nothing.

With `secrets.existingSecrets` the hook works on the Secrets you named. With `createSecrets: false` it is not rendered, so add the id-api clients and the caller tokens yourself (see Mode B).

#### Named id-api clients

id-api authenticates its service-to-service routes with named clients (`production.basic_auth.clients` in the id Secret: `name`, `secret_hash` = SHA-256 of the secret, `scopes`). Callers send `Basic base64(name:secret)`. The chart provisions one client per in-cluster caller, on install and (idempotently) in the pre-upgrade hook:

| Client | Scopes | Token written to |
|---|---|---|
| `task`, `event` | `user:read`, `user:write` | `LiquioId.basicAuthToken` (task / cabinet-api `auth.json`, event `user.json`) |
| `notification` | `user:read` | notification `config.json` `production.auth_server.basicAuthToken` |
| `cabinet-api` | `totp` | cabinet-api `auth.json` |
| `admin-api` | `user:read`, `user:write`, `user:admin`, `password:set`, `login_history`, `login_history:all`, `login_history:pii` | admin-api `auth.json` `basicAuthToken` |

`admin-api` sets user roles, blocks users and disables 2FA through id-api, so it holds `user:admin`. A named client can only set roles on the id `roles` allowlist (`config.id.assignableRoles`, default `individual`, `admin`, `admin-liquio-portal`): every role in the submitted value must be on the list, otherwise id-api answers 400. Change it if you rename the admin-api `clientId` (`admin-<clientId>`) or give users other roles through admin-api. The id config also lists `admin-api` in `users.fullReadClients`, so the admin user list can be shown without a filter.

The id config keeps `basic_auth.allowLegacySharedSecret: true` by default, because callers outside the chart may still use the shared secret (`oauth.secret_key`). All callers shipped in this chart now use named clients, so **once every caller of your deployment is named, you can set `allowLegacySharedSecret` to `false`** (`config.id.config.production.basic_auth.allowLegacySharedSecret: false`) and restart id-api. id-api logs `basic-auth-legacy-shared-secret-used` while the shared secret is still used, so check the logs for it before switching it off. With the shared secret off, any caller without a client gets 401, and the legacy secret no longer limits roles or scopes.

Notes for operators with a customised setup:

- The pre-upgrade hook replaces `basicAuthToken` in the admin-api `auth.json` only when the id Secret has no `admin-api` client yet. `clientSecret` (the OAuth client secret) is not touched.
- The admin journal ("user operations") shows who blocked a user: id-api records the human initiator that `admin-api` sends next to `service: admin-api`. Role, 2FA and password changes made through admin-api are audited with the service name only.

#### Notification admin password

The notification admin panel (`/admin`, login `adminConfigLogin`) uses `production.adminConfig.password`, which also signs the admin Digest nonces. The ConfigMap does not carry it any more. With `createSecrets: true` the install hook generates a random one into the notification Secret (`<release>-notification-secret-config`, key `config.json`, path `production.adminConfig.password`). Read it with:

```bash
kubectl get secret <release>-notification-secret-config -o jsonpath='{.data.config\.json}' | base64 -d | jq -r .production.adminConfig.password
```

To set your own, edit that key in the Secret (or in the Secret you name in `secrets.existingSecrets.notification`) and restart the notification Deployment. With `createSecrets: false`, add `{"production": {"adminConfig": {"password": "<your password>"}}}` to that Secret's `config.json` yourself; with no password the admin login is disabled. You can also set `config.notification.config.production.adminConfig.password` in values, but a Secret is preferred because values end up in a ConfigMap.

#### Mode B: Bring your own (`createSecrets: false`)

Helm does not create any secrets. You must pre-create all required secrets in the namespace before install.

Use:

The names below are the default secret names for release name `liquio`.
For any other release, replace the `liquio-` prefix with `<release>-`.

```yaml
secrets:
  createSecrets: false
  existingSecrets:
    caCerts: liquio-ca-certs
    id: liquio-id-secret-config
    admin-api: liquio-admin-api-secret-config
    cabinet-api: liquio-cabinet-api-secret-config
    event: liquio-event-secret-config
    external-reader: liquio-external-reader-secret-config
    filestorage: liquio-filestorage-secret-config
    gateway: liquio-gateway-secret-config
    manager: liquio-manager-secret-config
    notification: liquio-notification-secret-config
    pdf-generator: liquio-pdf-generator-secret-config
    register: liquio-register-secret-config
    sign-tool: liquio-sign-tool-secret-config
    task: liquio-task-secret-config
```

Notes:

- You can omit `existingSecrets` entirely if your pre-created secrets use the default names.
- `existingSecrets` is optional; any missing service key falls back to `<release>-<service>-secret-config`.
- Backend services read credentials from JSON files mounted via `SECRET_PATH` from these per-service secrets.
  - Sign-tool loads `x509.json` from the `sign-tool` secret (default: `<release>-sign-tool-secret-config`).
- `infra-secrets` is an internal chart secret used by PostgreSQL and RabbitMQ pods only.

### LDAP / Active Directory login

Disabled by default. Non-secret settings go into values under `config.id.config.production.auth_providers.ldap` (see the commented example in `values.yaml`). The service-account password, and the CA if you pass it inline as PEM, go into the id secret, whose `config.json` is merged over the configmap:

```bash
kubectl patch secret liquio-id-secret-config --namespace liquio --type merge \
  --patch "$(jq -cn --arg cfg "$(kubectl get secret liquio-id-secret-config -n liquio -o jsonpath='{.data.config\.json}' | base64 -d \
    | jq -c --arg pw "$LDAP_BIND_PASSWORD" '.production.auth_providers.ldap.connection.bindPassword = $pw')" \
    '{stringData: {"config.json": $cfg}}')"
```

Restart id-api after changing the secret. Requirements and behaviour (access groups, unit mapping, revocation) are described in [components/id-api/docs/ldap.md](../components/id-api/docs/ldap.md).

#### Install with your values

```bash
helm upgrade --install liquio ./helm-chart \
  -f ./helm-chart/values.yaml \
  -f ./my-values.yaml \
  --namespace liquio \
  --create-namespace
```

### NetworkPolicy

NetworkPolicy resources are created for every service when `networkPolicy.enabled: true` (the default). They follow a least-privilege model:

| Service type | Ingress allowed from | Egress allowed to |
|---|---|---|
| Frontends (`id-front`, `admin-front`, `cabinet-front`) | Ingress controller | DNS only |
| Public backends (`id-api`, `admin-api`, `cabinet-api`) | Ingress controller + Liquio pods | PostgreSQL, Redis, RabbitMQ |
| Internal backends (all other services) | Liquio pods only | PostgreSQL, Redis, RabbitMQ |
| Gateway | Ingress controller | All Liquio pods |
| Infrastructure (PostgreSQL, Redis, RabbitMQ) | Liquio pods | — |

```yaml
networkPolicy:
  enabled: true
  egress:
    postgres:
      enabled: true
    redis:
      enabled: true
    rabbitmq:
      enabled: true
    smtp:
      enabled: false
      host: ""
      port: 587
    sms:
      enabled: false
      host: ""
      port: 443
  ingress:
    ingressController:
      enabled: true
      namespaceSelector: {}   # match the ingress-controller namespace by label
    prometheus:
      enabled: false
      namespaceSelector: {}
```

To disable NetworkPolicy entirely (e.g. if your CNI does not support it):

```yaml
networkPolicy:
  enabled: false
```

### Internal TLS for notification and sign-tool (opt-in)

By default notification and sign-tool serve plain HTTP inside the cluster; the only control is the NetworkPolicy
(`networkPolicy.enabled`). Set `internalTls.enabled=true` to run both on HTTPS and make the in-chart callers verify it.
Off by default: with `internalTls.enabled=false` the rendered manifests are unchanged, except that the register `sign.json` and
the admin-api `internal_transport.json` now carry `allowPlainHttp: true` (id-api already did), which acknowledges the
production `http://` warnings.

| Value | Default | Meaning |
|-------|---------|---------|
| `internalTls.enabled` | `false` | Switch the feature on |
| `internalTls.secretName` | `""` | Existing Secret with `ca.crt`, `tls.crt`, `tls.key` (required when enabled; the render fails without it) |
| `internalTls.mtls` | `false` | Require client certificates (see the limit below) |

The Secret is yours to create, for example with cert-manager (a `Certificate` whose `secretName` is the value above and whose
`dnsNames` cover `<release>-notification`, `<release>-sign-tool` and their `.<namespace>.svc` forms). It is independent of
`secrets.createSecrets`, so it works the same with `true` and `false`.

What changes when enabled:

- notification (`config.json` `production.tls`) and sign-tool (`server.json` `tls`) get `{enabled, certPath, keyPath}` from the
  mounted Secret (`/var/www/internal-tls`), and their liveness and readiness probes use `scheme: HTTPS` on `/test/ping`.
- Every in-chart URL to them becomes `https://` (id, register, admin-api, task, event, manager and gateway configmaps).
  Service ports stay 80, so URLs keep an explicit port where the plain URL relied on the default.
- id-api (`internalTransport.ca`, `allowPlainHttp: false`), register (`sign.tls.ca`, `sign.allowPlainHttp: false`) and admin-api
  (`internal_transport.json` `ca`, `allowPlainHttp: false`) mount `ca.crt` and trust it. Verification is never disabled.
- task, event, manager and gateway have no CA option in their config. They get `NODE_EXTRA_CA_CERTS=/var/www/internal-tls/ca.crt`, which
  Node reads natively, so they verify the same CA. Only `ca.crt` is mounted in them.
- Each pod mounts only the keys it needs. Only the notification and sign-tool pods get `tls.key` (and register and admin-api when mTLS is on).
- No Ingress routes to notification or sign-tool (the NetworkPolicy also blocks the ingress controller), so no backend-protocol
  annotation is needed. If you add your own Ingress path to them, add `nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"`.

mTLS limit: with `internalTls.mtls=true` notification and sign-tool require a client certificate signed by the CA (except `/test/ping`
for the probes). Only register and admin-api can present one (the same Secret's `tls.crt` and `tls.key`). id-api, task, event, manager and
gateway cannot, so their calls get 401. Use `mtls` only when those callers are disabled or sit behind a mesh sidecar that adds the certificate.

Not covered: `x509.externalUrl` in id-api keeps its existing port (`:3004`) and only changes scheme; sign-tool's Service listens on 80.
Check that value for your deployment. Certificate rotation needs a pod restart, since certificates are read at startup.

### PodDisruptionBudget

A `PodDisruptionBudget` is created for each service that has `replicaCount >= 2`. This prevents voluntary disruptions (node drain, rolling upgrades) from taking down all replicas simultaneously.

```yaml
podDisruptionBudget:
  enabled: true
  minAvailable: 1
  unhealthyPodEvictionPolicy: AlwaysAllow
```

To take effect, scale the relevant services to at least 2 replicas:

```yaml
services:
  gateway:
    replicaCount: 2
  idApi:
    replicaCount: 2
```

PDBs are silently skipped for services with `replicaCount: 1` to avoid blocking single-node clusters.

## Architecture

The Liquio platform consists of several microservices:

### Frontend Services
- **id-front**: Identity service frontend
- **admin-front**: Administration panel frontend  
- **cabinet-front**: User cabinet frontend

### API Services
- **id-api**: Identity service API
- **admin-api**: Administration API
- **cabinet-api**: User cabinet API
- **external-reader**: External data reader service
- **filestorage**: File storage service

### Core Services
- **event**: Event processing service
- **gateway**: API gateway service
- **manager**: Business process manager
- **notification**: Notification service
- **register**: Document register service
- **sign-tool**: Digital signature service
- **task**: Task management service

### Infrastructure
- **PostgreSQL**: Primary database
- **RabbitMQ**: Message queue
- **Redis**: Cache and session store

## Networking

By default, services are exposed as ClusterIP. For external access, enable ingress:

```yaml
ingress:
  enabled: true
  hosts:
    - host: liquio.local
      paths:
        - path: /
          pathType: Prefix
          service: id-front
        - path: /admin
          pathType: Prefix
          service: admin-front
        - path: /cabinet
          pathType: Prefix
          service: cabinet-front
```

## Persistence

The chart supports persistent storage for:
- PostgreSQL data
- RabbitMQ data  
- Redis data
- Application file storage

## Security

The chart no longer stores application credential values in `values.yaml`.

- With `secrets.createSecrets: true`, a pre-install hook job generates secrets at install time.
- With `secrets.createSecrets: false`, provide all required secrets out-of-band and map names through `secrets.existingSecrets`.

## Monitoring

Health checks are configured for all services with appropriate liveness and readiness probes.

Probes use the open `/healthz` route. The diagnostic routes `/test/ping` and `/monitors/system` of **manager**, **gateway** and **event** are closed (403) unless `server.monitoring.isEnabled` is `true` and the request sends the header `x-monitoring-token` with the value of `server.monitoring.token`. With an empty token they stay closed. The chart has no Prometheus scrape config or ServiceMonitor, so nothing in it calls these routes except event's own ping to manager.

With `secrets.createSecrets: true` the install hook generates one random token per component, writes it to the component's secret config (`server.json`), and stores the plain values in the Secret `<release>-monitoring-tokens` (keys `manager`, `gateway`, `event`; rename with `secrets.existingSecrets.monitoring`). Give them to your scraper, for example:

```bash
kubectl get secret liquio-monitoring-tokens -n liquio -o jsonpath='{.data.manager}' | base64 -d
curl -H "x-monitoring-token: $TOKEN" http://liquio-manager/test/ping
```

The chart does not configure a Prometheus scrape job. Add the header to yours from that Secret, and set `networkPolicy.ingress.prometheus.enabled` so Prometheus can reach the pods.

To use a token of your own (or with `createSecrets: false`), put it in the component's secret config. The hook never overwrites a token that is already set:

```json
{ "monitoring": { "isEnabled": true, "token": "<random 32+ characters>" } }
```

Event's ping to manager reads `ping.manager.monitoringToken`; the hook sets it in the event Secret's `ping.json`, so set it to manager's token yourself in Mode B. Task's cross-service ping (`GET /test/ping/services`) is rendered from in-chart URLs, and the hook sets `ping.manager.monitoringToken` and `ping.gateway.monitoringToken` in the task Secret's `ping.json` (set them yourself in Mode B). Restart the Deployments after changing a secret.

With docker-compose, `scripts/init.sh` generates the tokens into `config/{manager,gateway,event}/server.json`, event's `ping.json` and task's `ping.json`.

## Troubleshooting

### Common Issues

1. **Database connection errors**: Ensure PostgreSQL is running and accessible
2. **Service startup failures**: Check logs with `kubectl logs`
3. **Configuration issues**: Verify ConfigMaps are properly generated

### Useful Commands

```bash
# Check pod status
kubectl get pods

# View service logs
kubectl logs deployment/liquio-id-api

# Check configuration
kubectl get configmaps

# View secrets
kubectl get secrets
```

## Upgrading

To upgrade an existing deployment:

```bash
helm upgrade liquio ./helm-chart -f my-values.yaml
```

## Generating user certs

```bash
# Set the helm chart deployment name
export HELM_NAME=liquio

# Generate admin user
./scripts/generate-user.sh --k8s-secret "$HELM_NAME-ca-certs" --common-name "Liquio Admin" --serial-number "0000000001" --password "admin" --output admin.p12

# Generate demo user
./scripts/generate-user.sh --k8s-secret "$HELM_NAME-ca-certs" --common-name "Liquio Demo" --serial-number "3123456789" --password "demo" --output demo.p12
```

## Uninstalling

To uninstall the deployment:

```bash
helm uninstall liquio
```

**Note**: This will not delete persistent volumes by default. To also delete data:

```bash
kubectl delete pvc --all
```
