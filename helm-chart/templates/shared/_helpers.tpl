{{/*
Expand the name of the chart.
*/}}
{{- define "liquio.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "liquio.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "liquio.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "liquio.labels" -}}
helm.sh/chart: {{ include "liquio.chart" . }}
{{ include "liquio.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "liquio.selectorLabels" -}}
app.kubernetes.io/name: {{ include "liquio.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Namespace name
*/}}
{{- define "liquio.namespace" -}}
{{- if .Values.namespace.name }}
{{- .Values.namespace.name }}
{{- else }}
{{- .Release.Namespace }}
{{- end }}
{{- end }}

{{/*
Component selector labels
*/}}
{{- define "liquio.componentSelectorLabels" -}}
app.kubernetes.io/name: {{ include "liquio.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: {{ .component }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "liquio.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "liquio.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Create a default image name
*/}}
{{- define "liquio.image" -}}
{{- $registry := .Values.global.imageRegistry | default .Values.image.registry -}}
{{- $tag := .Values.image.tag | default .Chart.AppVersion -}}
{{- $services := .Values.services -}}
{{- $component := .component -}}
{{- $repository := printf "liquio-%s" .component -}}
{{- if hasKey $services $component -}}
  {{- if hasKey (index $services $component) "image" -}}
    {{- if hasKey (index $services $component "image") "repository" -}}
      {{- $repository = index $services $component "image" "repository" -}}
    {{- end -}}
  {{- end -}}
{{- end -}}
{{- if $registry -}}
{{ $registry }}/{{ $repository }}:{{ $tag }}
{{- else -}}
{{ $repository }}:{{ $tag }}
{{- end -}}
{{- end }}

{{/*
Secret name helper
*/}}
{{- define "liquio.secrets.name" -}}
{{- .Values.secrets.existingSecret | default (printf "%s-secrets" (include "liquio.fullname" .)) }}
{{- end }}

{{/*
Generate PostgreSQL password value
*/}}
{{- define "liquio.postgresql.passwordValue" -}}
{{- if .Values.secrets.postgresql.password }}
{{- .Values.secrets.postgresql.password }}
{{- else }}
{{- randAlphaNum 32 }}
{{- end }}
{{- end }}

{{/*
PostgreSQL secret key/value helper
*/}}
{{- define "liquio.postgresql.password" -}}
{{- if .Values.secrets.existingSecret }}
{{- "postgresql-password" -}}
{{- else }}
{{- include "liquio.postgresql.passwordValue" . }}
{{- end }}
{{- end }}

{{/*
Generate RabbitMQ password value
*/}}
{{- define "liquio.rabbitmq.passwordValue" -}}
{{- if .Values.secrets.rabbitmq.password }}
{{- .Values.secrets.rabbitmq.password }}
{{- else }}
{{- randAlphaNum 32 }}
{{- end }}
{{- end }}

{{/*
RabbitMQ secret key/value helper
*/}}
{{- define "liquio.rabbitmq.password" -}}
{{- if .Values.secrets.existingSecret }}
{{- "rabbitmq-password" -}}
{{- else }}
{{- include "liquio.rabbitmq.passwordValue" . }}
{{- end }}
{{- end }}

{{/*
Generate OAuth secret key value
*/}}
{{- define "liquio.oauth.secretKeyValue" -}}
{{- if .Values.secrets.oauth.secretKey }}
{{- .Values.secrets.oauth.secretKey }}
{{- else }}
{{- randAlphaNum 32 }}
{{- end }}
{{- end }}

{{/*
OAuth secret key/key helper
*/}}
{{- define "liquio.oauth.secretKey" -}}
{{- if .Values.secrets.existingSecret }}
{{- "oauth-secret-key" -}}
{{- else }}
{{- include "liquio.oauth.secretKeyValue" . }}
{{- end }}
{{- end }}

{{/*
Generate JWT secret value
*/}}
{{- define "liquio.jwt.secretValue" -}}
{{- if .Values.secrets.jwt.secret }}
{{- .Values.secrets.jwt.secret }}
{{- else }}
{{- randAlphaNum 32 }}
{{- end }}
{{- end }}

{{/*
JWT secret key/value helper
*/}}
{{- define "liquio.jwt.secret" -}}
{{- if .Values.secrets.existingSecret }}
{{- "jwt-secret" -}}
{{- else }}
{{- include "liquio.jwt.secretValue" . }}
{{- end }}
{{- end }}

{{/*
Generate Register encryption key value
*/}}
{{- define "liquio.register.encryptionKeyValue" -}}
{{- if .Values.secrets.register.encryptionKey }}
{{- .Values.secrets.register.encryptionKey }}
{{- else }}
{{- randAlphaNum 32 }}
{{- end }}
{{- end }}

{{/*
Register encryption key/key helper
*/}}
{{- define "liquio.register.encryptionKey" -}}
{{- if .Values.secrets.existingSecret }}
{{- "register-encryption-key" -}}
{{- else }}
{{- include "liquio.register.encryptionKeyValue" . }}
{{- end }}
{{- end }}

{{/*
Generate Register auth token value
*/}}
{{- define "liquio.register.authTokenValue" -}}
{{- if .Values.secrets.register.authToken }}
{{- .Values.secrets.register.authToken }}
{{- else }}
{{- printf "Basic %s" (printf "register:%s" (randAlphaNum 32) | b64enc) }}
{{- end }}
{{- end }}

{{/*
Register auth token key/value helper
*/}}
{{- define "liquio.register.authToken" -}}
{{- if .Values.secrets.existingSecret }}
{{- "register-auth-token" -}}
{{- else }}
{{- include "liquio.register.authTokenValue" . }}
{{- end }}
{{- end }}

{{/*
Generate External Reader auth token value
*/}}
{{- define "liquio.externalReader.authTokenValue" -}}
{{- if .Values.secrets.externalReader.authToken }}
{{- .Values.secrets.externalReader.authToken }}
{{- else }}
{{- printf "Basic %s" (printf "external-reader:%s" (randAlphaNum 32) | b64enc) }}
{{- end }}
{{- end }}

{{/*
External Reader auth token key/value helper
*/}}
{{- define "liquio.externalReader.authToken" -}}
{{- if .Values.secrets.existingSecret }}
{{- "external-reader-auth-token" -}}
{{- else }}
{{- include "liquio.externalReader.authTokenValue" . }}
{{- end }}
{{- end }}

{{/*
Generate File Storage auth token value
*/}}
{{- define "liquio.filestorage.authTokenValue" -}}
{{- if .Values.secrets.filestorage.authToken }}
{{- .Values.secrets.filestorage.authToken }}
{{- else }}
{{- printf "Basic %s" (printf "filestorage:%s" (randAlphaNum 32) | b64enc) }}
{{- end }}
{{- end }}

{{/*
File Storage auth token key/value helper
*/}}
{{- define "liquio.filestorage.authToken" -}}
{{- if .Values.secrets.existingSecret }}
{{- "filestorage-auth-token" -}}
{{- else }}
{{- include "liquio.filestorage.authTokenValue" . }}
{{- end }}
{{- end }}

{{/*
PostgreSQL connection string
*/}}
{{- define "liquio.postgresql.host" -}}
{{- if .Values.postgresql.enabled }}
{{- printf "%s-postgresql" (include "liquio.fullname" .) }}
{{- else }}
{{- .Values.config.database.host }}
{{- end }}
{{- end }}

{{/*
RabbitMQ connection string
*/}}
{{- define "liquio.rabbitmq.host" -}}
{{- if .Values.rabbitmq.enabled }}
{{- printf "%s-rabbitmq" (include "liquio.fullname" .) }}
{{- else }}
{{- .Values.config.rabbitmq.host }}
{{- end }}
{{- end }}

{{/*
Redis connection string
*/}}
{{- define "liquio.redis.host" -}}
{{- if .Values.redis.enabled }}
{{- printf "%s-redis-master" (include "liquio.fullname" .) }}
{{- else }}
{{- .Values.config.redis.host }}
{{- end }}
{{- end }}
