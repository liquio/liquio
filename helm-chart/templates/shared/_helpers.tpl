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
URL scheme for browser-facing URLs.
Liquio Helm now supports HTTPS only.
*/}}
{{- define "liquio.scheme" -}}
https
{{- end }}

{{/*
Return base public domain without leading separator.
Examples:
  .liquio.local -> liquio.local
  -frankfurt-liquio-stg.kitsoft.ua -> frankfurt-liquio-stg.kitsoft.ua
*/}}
{{- define "liquio.publicDomain" -}}
{{- $domain := default ".liquio.local" .Values.global.domain -}}
{{- $domain | trimPrefix "." | trimPrefix "-" -}}
{{- end }}

{{/*
Build public host for a service using global.domain.
If global.domain starts with '.' or '-', concatenate directly: id + .liquio.local, id + -frankfurt...
Otherwise fall back to dotted host: id.liquio.local
Usage: {{ include "liquio.publicHost" (dict "ctx" . "service" "id") }}
*/}}
{{- define "liquio.publicHost" -}}
{{- $ctx := .ctx -}}
{{- $service := .service -}}
{{- $domain := default ".liquio.local" $ctx.Values.global.domain -}}
{{- if or (hasPrefix "." $domain) (hasPrefix "-" $domain) -}}
{{- printf "%s%s" $service $domain -}}
{{- else -}}
{{- printf "%s.%s" $service $domain -}}
{{- end -}}
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
{{- .Release.Namespace }}
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
{{- $component := .component -}}
{{- $repository := .component -}}
{{- if hasKey .Values.serviceVersions $component -}}
  {{- $tag = index .Values.serviceVersions $component -}}
{{- end -}}
{{- $services := .Values.services -}}
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
Per-service secret-config Secret name.
Usage: {{ include "liquio.secretConfig.name" (dict "ctx" . "service" "gateway") }}
*/}}
{{- define "liquio.secretConfig.name" -}}
{{- $existingSecrets := .ctx.Values.secrets.existingSecrets | default dict -}}
{{- if and (kindIs "map" $existingSecrets) (hasKey $existingSecrets .service) -}}
{{- index $existingSecrets .service -}}
{{- else -}}
{{- printf "%s-%s-secret-config" (include "liquio.fullname" .ctx) .service -}}
{{- end -}}
{{- end }}

{{/*
Whether the init-secrets Job should run (i.e. Helm manages secret creation).
Defaults to true when secrets.createSecrets is not set.
*/}}
{{- define "liquio.secrets.create" -}}
{{- $create := true -}}
{{- if and .Values.secrets (hasKey .Values.secrets "createSecrets") -}}
  {{- $create = .Values.secrets.createSecrets -}}
{{- end -}}
{{- if $create -}}true{{- else -}}false{{- end -}}
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
