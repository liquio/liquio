# Liquio Helm Chart

This Helm chart deploys the Liquio platform on Kubernetes.

## Prerequisites

- Kubernetes cluster (version 1.16+)
- Helm 3.0+
- PostgreSQL (can be deployed as part of this chart)
- RabbitMQ (can be deployed as part of this chart)
- Redis (can be deployed as part of this chart)

## Installation

### Quick Start

1. Build Docker images for all components:
   ```bash
   # Build images for each service
   docker build -t id-front:latest ./id-front
   docker build -t id-api:latest ./id-api
   docker build -t admin-front:latest ./admin-front
   docker build -t admin-api:latest ./admin-api
   docker build -t cabinet-front:latest ./cabinet-front
   docker build -t cabinet-api:latest ./cabinet-api
   docker build -t event:latest ./event
   docker build -t gateway:latest ./gateway
   docker build -t manager:latest ./manager
   docker build -t notification:latest ./notification
   docker build -t register:latest ./register
   docker build -t sign-tool:latest ./sign-tool
   docker build -t task:latest ./task
   docker build -t external-reader:latest ./external-reader
   docker build -t filestorage:latest ./filestorage
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
| `postgresql.enabled` | Deploy PostgreSQL | `true` |
| `postgresql.auth.username` | PostgreSQL username | `postgres` |
| `postgresql.auth.password` | PostgreSQL password | `changeme` |

### Message Queue Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `rabbitmq.enabled` | Deploy RabbitMQ | `true` |
| `rabbitmq.auth.username` | RabbitMQ username | `guest` |
| `rabbitmq.auth.password` | RabbitMQ password | `changeme` |

### Cache Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `redis.enabled` | Deploy Redis | `true` |
| `redis.auth.enabled` | Enable Redis auth | `false` |

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

The chart automatically generates secrets for:
- Database passwords
- OAuth keys
- JWT secrets
- Service authentication tokens

## Monitoring

Health checks are configured for all services with appropriate liveness and readiness probes.

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
