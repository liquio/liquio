{{/*
══════════════════════════════════════════════════════════════
NetworkPolicy named templates
══════════════════════════════════════════════════════════════

All templates accept:
  dict "component" "<app.kubernetes.io/component label value>" "context" .

where "context" is the standard Helm dot (.) — gives access to
.Values, .Release, .Chart, and all built-in helpers.
*/}}

{{/*
──────────────────────────────────────────────────────────────
liquio.networkPolicy.frontend
  Covers: admin-front, cabinet-front, id-front
  Ingress: ingress-controller namespace + optional Prometheus
  Egress:  DNS only — no backend or infrastructure access
──────────────────────────────────────────────────────────────
*/}}
{{- define "liquio.networkPolicy.frontend" -}}
{{- $ctx := .context -}}
{{- $component := .component -}}
{{- if $ctx.Values.networkPolicy.enabled }}
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: {{ include "liquio.fullname" $ctx }}-{{ $component }}
  namespace: {{ include "liquio.namespace" $ctx }}
  labels:
    {{- include "liquio.labels" $ctx | nindent 4 }}
    app.kubernetes.io/component: {{ $component }}
spec:
  podSelector:
    matchLabels:
      {{- include "liquio.selectorLabels" $ctx | nindent 6 }}
      app.kubernetes.io/component: {{ $component }}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    {{- if $ctx.Values.networkPolicy.ingress.ingressController.enabled }}
    - from:
        - namespaceSelector:
            matchLabels:
              {{- if $ctx.Values.networkPolicy.ingress.ingressController.namespaceSelector }}
              {{- toYaml $ctx.Values.networkPolicy.ingress.ingressController.namespaceSelector | nindent 14 }}
              {{- else }}
              kubernetes.io/metadata.name: ingress-nginx
              {{- end }}
    {{- end }}
    {{- if $ctx.Values.networkPolicy.ingress.prometheus.enabled }}
    - from:
        - namespaceSelector:
            matchLabels:
              {{- if $ctx.Values.networkPolicy.ingress.prometheus.namespaceSelector }}
              {{- toYaml $ctx.Values.networkPolicy.ingress.prometheus.namespaceSelector | nindent 14 }}
              {{- else }}
              kubernetes.io/metadata.name: monitoring
              {{- end }}
    {{- end }}
  egress:
    # DNS resolution
    - ports:
        - port: 53
          protocol: UDP
        - port: 53
          protocol: TCP
{{- end }}
{{- end -}}

{{/*
──────────────────────────────────────────────────────────────
liquio.networkPolicy.backend
  Covers: id-api, admin-api, cabinet-api (public)
          event, external-reader, filestorage, manager,
          notification, register, sign-tool, task (internal)
  Ingress: ingress-controller + any Liquio pod (inter-service
           calls, migration jobs, healthchecks)
  Egress:  DNS; PostgreSQL/Redis/RabbitMQ (podSelector when
           internal, port-only when external); optional
           SMTP and SMS outbound
──────────────────────────────────────────────────────────────
*/}}
{{- define "liquio.networkPolicy.backend" -}}
{{- $ctx := .context -}}
{{- $component := .component -}}
{{- if $ctx.Values.networkPolicy.enabled }}
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: {{ include "liquio.fullname" $ctx }}-{{ $component }}
  namespace: {{ include "liquio.namespace" $ctx }}
  labels:
    {{- include "liquio.labels" $ctx | nindent 4 }}
    app.kubernetes.io/component: {{ $component }}
spec:
  podSelector:
    matchLabels:
      {{- include "liquio.selectorLabels" $ctx | nindent 6 }}
      app.kubernetes.io/component: {{ $component }}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    {{- if $ctx.Values.networkPolicy.ingress.ingressController.enabled }}
    - from:
        - namespaceSelector:
            matchLabels:
              {{- if $ctx.Values.networkPolicy.ingress.ingressController.namespaceSelector }}
              {{- toYaml $ctx.Values.networkPolicy.ingress.ingressController.namespaceSelector | nindent 14 }}
              {{- else }}
              kubernetes.io/metadata.name: ingress-nginx
              {{- end }}
    {{- end }}
    {{- if $ctx.Values.networkPolicy.ingress.prometheus.enabled }}
    - from:
        - namespaceSelector:
            matchLabels:
              {{- if $ctx.Values.networkPolicy.ingress.prometheus.namespaceSelector }}
              {{- toYaml $ctx.Values.networkPolicy.ingress.prometheus.namespaceSelector | nindent 14 }}
              {{- else }}
              kubernetes.io/metadata.name: monitoring
              {{- end }}
    {{- end }}
    # Inter-service: any Liquio pod in this namespace (gateway, peers, migration jobs)
    - from:
        - podSelector:
            matchLabels:
              {{- include "liquio.selectorLabels" $ctx | nindent 14 }}
  egress:
    # DNS resolution
    - ports:
        - port: 53
          protocol: UDP
        - port: 53
          protocol: TCP
    {{- if $ctx.Values.networkPolicy.egress.postgres.enabled }}
    # PostgreSQL
    {{- if $ctx.Values.postgresql.enabled }}
    - to:
        - podSelector:
            matchLabels:
              {{- include "liquio.selectorLabels" $ctx | nindent 14 }}
              app.kubernetes.io/component: postgresql
      ports:
        - port: {{ $ctx.Values.config.database.port | int }}
          protocol: TCP
    {{- else }}
    # External PostgreSQL: restrict to port only
    - ports:
        - port: {{ $ctx.Values.config.database.port | int }}
          protocol: TCP
    {{- end }}
    {{- end }}
    {{- if $ctx.Values.networkPolicy.egress.redis.enabled }}
    # Redis
    {{- if $ctx.Values.redis.enabled }}
    - to:
        - podSelector:
            matchLabels:
              {{- include "liquio.selectorLabels" $ctx | nindent 14 }}
              app.kubernetes.io/component: redis
      ports:
        - port: {{ $ctx.Values.config.redis.port | int }}
          protocol: TCP
    {{- else }}
    # External Redis: restrict to port only
    - ports:
        - port: {{ $ctx.Values.config.redis.port | int }}
          protocol: TCP
    {{- end }}
    {{- end }}
    {{- if $ctx.Values.networkPolicy.egress.rabbitmq.enabled }}
    # RabbitMQ
    {{- if $ctx.Values.rabbitmq.enabled }}
    - to:
        - podSelector:
            matchLabels:
              {{- include "liquio.selectorLabels" $ctx | nindent 14 }}
              app.kubernetes.io/component: rabbitmq
      ports:
        - port: {{ $ctx.Values.config.rabbitmq.port | int }}
          protocol: TCP
    {{- else }}
    # External RabbitMQ: restrict to port only
    - ports:
        - port: {{ $ctx.Values.config.rabbitmq.port | int }}
          protocol: TCP
    {{- end }}
    {{- end }}
    {{- if $ctx.Values.networkPolicy.egress.smtp.enabled }}
    # SMTP relay
    - ports:
        - port: {{ $ctx.Values.networkPolicy.egress.smtp.port | int }}
          protocol: TCP
    {{- end }}
    {{- if $ctx.Values.networkPolicy.egress.sms.enabled }}
    # SMS gateway
    - ports:
        - port: {{ $ctx.Values.networkPolicy.egress.sms.port | int }}
          protocol: TCP
    {{- end }}
{{- end }}
{{- end -}}

{{/*
──────────────────────────────────────────────────────────────
liquio.networkPolicy.backendInternal
  Covers: event, external-reader, filestorage, manager,
          notification, register, sign-tool, task
  These services are NOT reachable from the ingress-controller;
  they are only reachable from other Liquio pods (gateway, peers,
  migration jobs).
  Ingress: Liquio pods in this namespace only
  Egress:  same as liquio.networkPolicy.backend
──────────────────────────────────────────────────────────────
*/}}
{{- define "liquio.networkPolicy.backendInternal" -}}
{{- $ctx := .context -}}
{{- $component := .component -}}
{{- if $ctx.Values.networkPolicy.enabled }}
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: {{ include "liquio.fullname" $ctx }}-{{ $component }}
  namespace: {{ include "liquio.namespace" $ctx }}
  labels:
    {{- include "liquio.labels" $ctx | nindent 4 }}
    app.kubernetes.io/component: {{ $component }}
spec:
  podSelector:
    matchLabels:
      {{- include "liquio.selectorLabels" $ctx | nindent 6 }}
      app.kubernetes.io/component: {{ $component }}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    {{- if $ctx.Values.networkPolicy.ingress.prometheus.enabled }}
    - from:
        - namespaceSelector:
            matchLabels:
              {{- if $ctx.Values.networkPolicy.ingress.prometheus.namespaceSelector }}
              {{- toYaml $ctx.Values.networkPolicy.ingress.prometheus.namespaceSelector | nindent 14 }}
              {{- else }}
              kubernetes.io/metadata.name: monitoring
              {{- end }}
    {{- end }}
    # Inter-service: any Liquio pod in this namespace (gateway, peers, migration jobs)
    - from:
        - podSelector:
            matchLabels:
              {{- include "liquio.selectorLabels" $ctx | nindent 14 }}
  egress:
    # DNS resolution
    - ports:
        - port: 53
          protocol: UDP
        - port: 53
          protocol: TCP
    {{- if $ctx.Values.networkPolicy.egress.postgres.enabled }}
    # PostgreSQL
    {{- if $ctx.Values.postgresql.enabled }}
    - to:
        - podSelector:
            matchLabels:
              {{- include "liquio.selectorLabels" $ctx | nindent 14 }}
              app.kubernetes.io/component: postgresql
      ports:
        - port: {{ $ctx.Values.config.database.port | int }}
          protocol: TCP
    {{- else }}
    # External PostgreSQL: restrict to port only
    - ports:
        - port: {{ $ctx.Values.config.database.port | int }}
          protocol: TCP
    {{- end }}
    {{- end }}
    {{- if $ctx.Values.networkPolicy.egress.redis.enabled }}
    # Redis
    {{- if $ctx.Values.redis.enabled }}
    - to:
        - podSelector:
            matchLabels:
              {{- include "liquio.selectorLabels" $ctx | nindent 14 }}
              app.kubernetes.io/component: redis
      ports:
        - port: {{ $ctx.Values.config.redis.port | int }}
          protocol: TCP
    {{- else }}
    # External Redis: restrict to port only
    - ports:
        - port: {{ $ctx.Values.config.redis.port | int }}
          protocol: TCP
    {{- end }}
    {{- end }}
    {{- if $ctx.Values.networkPolicy.egress.rabbitmq.enabled }}
    # RabbitMQ
    {{- if $ctx.Values.rabbitmq.enabled }}
    - to:
        - podSelector:
            matchLabels:
              {{- include "liquio.selectorLabels" $ctx | nindent 14 }}
              app.kubernetes.io/component: rabbitmq
      ports:
        - port: {{ $ctx.Values.config.rabbitmq.port | int }}
          protocol: TCP
    {{- else }}
    # External RabbitMQ: restrict to port only
    - ports:
        - port: {{ $ctx.Values.config.rabbitmq.port | int }}
          protocol: TCP
    {{- end }}
    {{- end }}
    {{- if $ctx.Values.networkPolicy.egress.smtp.enabled }}
    # SMTP relay
    - ports:
        - port: {{ $ctx.Values.networkPolicy.egress.smtp.port | int }}
          protocol: TCP
    {{- end }}
    {{- if $ctx.Values.networkPolicy.egress.sms.enabled }}
    # SMS gateway
    - ports:
        - port: {{ $ctx.Values.networkPolicy.egress.sms.port | int }}
          protocol: TCP
    {{- end }}
{{- end }}
{{- end -}}

{{/*
──────────────────────────────────────────────────────────────
liquio.networkPolicy.gateway
  Covers: gateway
  Ingress: ingress-controller namespace + optional Prometheus
  Egress:  DNS + all backend-tier pods in namespace
──────────────────────────────────────────────────────────────
*/}}
{{- define "liquio.networkPolicy.gateway" -}}
{{- $ctx := .context -}}
{{- $component := .component -}}
{{- if $ctx.Values.networkPolicy.enabled }}
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: {{ include "liquio.fullname" $ctx }}-{{ $component }}
  namespace: {{ include "liquio.namespace" $ctx }}
  labels:
    {{- include "liquio.labels" $ctx | nindent 4 }}
    app.kubernetes.io/component: {{ $component }}
spec:
  podSelector:
    matchLabels:
      {{- include "liquio.selectorLabels" $ctx | nindent 6 }}
      app.kubernetes.io/component: {{ $component }}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    {{- if $ctx.Values.networkPolicy.ingress.ingressController.enabled }}
    - from:
        - namespaceSelector:
            matchLabels:
              {{- if $ctx.Values.networkPolicy.ingress.ingressController.namespaceSelector }}
              {{- toYaml $ctx.Values.networkPolicy.ingress.ingressController.namespaceSelector | nindent 14 }}
              {{- else }}
              kubernetes.io/metadata.name: ingress-nginx
              {{- end }}
    {{- end }}
    {{- if $ctx.Values.networkPolicy.ingress.prometheus.enabled }}
    - from:
        - namespaceSelector:
            matchLabels:
              {{- if $ctx.Values.networkPolicy.ingress.prometheus.namespaceSelector }}
              {{- toYaml $ctx.Values.networkPolicy.ingress.prometheus.namespaceSelector | nindent 14 }}
              {{- else }}
              kubernetes.io/metadata.name: monitoring
              {{- end }}
    {{- end }}
  egress:
    # DNS resolution
    - ports:
        - port: 53
          protocol: UDP
        - port: 53
          protocol: TCP
    # Route to all backend-tier services in this namespace
    - to:
        - podSelector:
            matchLabels:
              {{- include "liquio.selectorLabels" $ctx | nindent 14 }}
              app.kubernetes.io/tier: backend
{{- end }}
{{- end -}}

{{/*
──────────────────────────────────────────────────────────────
liquio.networkPolicy.infra
  Covers: postgresql, redis, rabbitmq (internal deployments)
  Ingress: any Liquio pod in namespace (backends + migration jobs)
  Egress:  DNS only
──────────────────────────────────────────────────────────────
*/}}
{{- define "liquio.networkPolicy.infra" -}}
{{- $ctx := .context -}}
{{- $component := .component -}}
{{- if $ctx.Values.networkPolicy.enabled }}
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: {{ include "liquio.fullname" $ctx }}-{{ $component }}
  namespace: {{ include "liquio.namespace" $ctx }}
  labels:
    {{- include "liquio.labels" $ctx | nindent 4 }}
    app.kubernetes.io/component: {{ $component }}
spec:
  podSelector:
    matchLabels:
      {{- include "liquio.selectorLabels" $ctx | nindent 6 }}
      app.kubernetes.io/component: {{ $component }}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # Allow from any Liquio pod: API services, backends, migration jobs
    - from:
        - podSelector:
            matchLabels:
              {{- include "liquio.selectorLabels" $ctx | nindent 14 }}
  egress:
    # DNS resolution
    - ports:
        - port: 53
          protocol: UDP
        - port: 53
          protocol: TCP
{{- end }}
{{- end -}}
