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
Generate PostgreSQL password
*/}}
{{- define "liquio.postgresql.password" -}}
{{- if .Values.secrets.postgresql.password }}
{{- .Values.secrets.postgresql.password }}
{{- else }}
{{- randAlphaNum 32 }}
{{- end }}
{{- end }}

{{/*
Generate RabbitMQ password
*/}}
{{- define "liquio.rabbitmq.password" -}}
{{- if .Values.secrets.rabbitmq.password }}
{{- .Values.secrets.rabbitmq.password }}
{{- else }}
{{- randAlphaNum 32 }}
{{- end }}
{{- end }}

{{/*
Generate OAuth secret key
*/}}
{{- define "liquio.oauth.secretKey" -}}
{{- if .Values.secrets.oauth.secretKey }}
{{- .Values.secrets.oauth.secretKey }}
{{- else }}
{{- randAlphaNum 32 }}
{{- end }}
{{- end }}

{{/*
Generate JWT secret
*/}}
{{- define "liquio.jwt.secret" -}}
{{- if .Values.secrets.jwt.secret }}
{{- .Values.secrets.jwt.secret }}
{{- else }}
{{- randAlphaNum 32 }}
{{- end }}
{{- end }}

{{/*
Generate Register encryption key
*/}}
{{- define "liquio.register.encryptionKey" -}}
{{- if .Values.secrets.register.encryptionKey }}
{{- .Values.secrets.register.encryptionKey }}
{{- else }}
{{- randAlphaNum 32 }}
{{- end }}
{{- end }}

{{/*
Generate Register auth token
*/}}
{{- define "liquio.register.authToken" -}}
{{- if .Values.secrets.register.authToken }}
{{- .Values.secrets.register.authToken }}
{{- else }}
{{- printf "Basic %s" (printf "register:%s" (randAlphaNum 32) | b64enc) }}
{{- end }}
{{- end }}

{{/*
Generate External Reader auth token
*/}}
{{- define "liquio.externalReader.authToken" -}}
{{- if .Values.secrets.externalReader.authToken }}
{{- .Values.secrets.externalReader.authToken }}
{{- else }}
{{- printf "Basic %s" (printf "external-reader:%s" (randAlphaNum 32) | b64enc) }}
{{- end }}
{{- end }}

{{/*
Generate File Storage auth token
*/}}
{{- define "liquio.filestorage.authToken" -}}
{{- if .Values.secrets.filestorage.authToken }}
{{- .Values.secrets.filestorage.authToken }}
{{- else }}
{{- printf "Basic %s" (printf "filestorage:%s" (randAlphaNum 32) | b64enc) }}
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
