# Liquio Helm Chart Templates Organization

This directory contains the Kubernetes manifests for the Liquio platform, organized by service categories:

## Directory Structure

### 📁 `shared/`
Common templates used across all services:
- `_helpers.tpl` - Helm template helpers and functions
- `configmaps.yaml` - Global configuration maps
- `secrets.yaml` - Secret management templates
- `serviceaccount.yaml` - Service account definitions
- `migrations.yaml` - Database migration jobs
- `ingress.yaml` - Ingress controller configuration

### 📁 `infrastructure/`
Core infrastructure services:
- `infrastructure-postgresql.yaml` - PostgreSQL database
- `infrastructure-rabbitmq.yaml` - RabbitMQ message broker
- `infrastructure-redis.yaml` - Redis cache

### 📁 `core-services/`
Essential platform services:
- `id-api.yaml` - Identity & Authentication API
- `id-front.yaml` - Identity & Authentication Frontend
- `configmap-id.yaml` - ID service configuration
- `configmap-gateway.yaml` - API Gateway configuration
- `configmap-filestorage.yaml` - File storage configuration

### 📁 `admin/`
Administration services:
- `admin-api.yaml` - Administration API
- `admin-front.yaml` - Administration Frontend
- `configmap-admin-api.yaml` - Admin API configuration
- `configmap-admin-front.yaml` - Admin Frontend configuration

### 📁 `cabinet/`
Document cabinet services:
- `cabinet-api.yaml` - Document Cabinet API
- `cabinet-front.yaml` - Document Cabinet Frontend
- `configmap-cabinet-api.yaml` - Cabinet API configuration
- `configmap-cabinet-front.yaml` - Cabinet Frontend configuration

### 📁 `workflows/`
Workflow and process management services:
- `configmap-manager.yaml` - Process manager configuration
- `configmap-task.yaml` - Task service configuration
- `configmap-event.yaml` - Event service configuration
- `configmap-register.yaml` - Registry service configuration

### 📁 `integrations/`
External integration services:
- `configmap-external-reader.yaml` - External reader service
- `configmap-notification.yaml` - Notification service
- `configmap-sign-tool.yaml` - Digital signing service

## Template Guidelines

1. **Service Grouping**: Each service should have its deployment, service, and configmap templates in the same directory
2. **Naming Convention**: Files should be named `{service-name}.yaml` for deployments and `configmap-{service-name}.yaml` for configurations
3. **Labels**: All resources should use consistent labeling with `app.kubernetes.io/component` for service identification
4. **Dependencies**: Services that depend on others should use proper Helm ordering and readiness checks

## Adding New Services

When adding a new service:
1. Choose the appropriate directory based on service function
2. Create deployment and service definitions in `{service-name}.yaml`
3. Create configuration in `configmap-{service-name}.yaml`
4. Update the main `values.yaml` with service configuration options
5. Add appropriate conditional rendering with `{{- if .Values.services.{serviceName}.enabled }}`
