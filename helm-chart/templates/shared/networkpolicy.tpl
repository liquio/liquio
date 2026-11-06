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
    {{- include "liquio.networkPolicy.serviceEgress" (dict "ctx" $ctx "component" $component) | nindent 4 }}
    {{- include "liquio.networkPolicy.externalEgress" (dict "ctx" $ctx "component" $component) | nindent 4 }}
{{- end }}
{{- end -}}

{{/*
──────────────────────────────────────────────────────────────
liquio.networkPolicy.backend
  Covers: id-api, admin-api, cabinet-api (public)
          event, external-reader, filestorage, manager,
          notification, pdf-generator, register, sign-tool,
          task (internal)
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
    {{- include "liquio.networkPolicy.serviceEgress" (dict "ctx" $ctx "component" $component) | nindent 4 }}
    {{- include "liquio.networkPolicy.externalEgress" (dict "ctx" $ctx "component" $component) | nindent 4 }}
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
    # External PostgreSQL: restrict to port only, link-local excluded
    - to:
        {{- include "liquio.networkPolicy.anyIPv4" . | nindent 8 }}
      ports:
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
    # External Redis: restrict to port only, link-local excluded
    - to:
        {{- include "liquio.networkPolicy.anyIPv4" . | nindent 8 }}
      ports:
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
    # External RabbitMQ: restrict to port only, link-local excluded
    - to:
        {{- include "liquio.networkPolicy.anyIPv4" . | nindent 8 }}
      ports:
        - port: {{ $ctx.Values.config.rabbitmq.port | int }}
          protocol: TCP
    {{- end }}
    {{- end }}
    {{- if $ctx.Values.networkPolicy.egress.smtp.enabled }}
    # SMTP relay: port only, link-local excluded
    - to:
        {{- include "liquio.networkPolicy.anyIPv4" . | nindent 8 }}
      ports:
        - port: {{ $ctx.Values.networkPolicy.egress.smtp.port | int }}
          protocol: TCP
    {{- end }}
    {{- if $ctx.Values.networkPolicy.egress.sms.enabled }}
    # SMS gateway: port only, link-local excluded
    - to:
        {{- include "liquio.networkPolicy.anyIPv4" . | nindent 8 }}
      ports:
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
    {{- include "liquio.networkPolicy.serviceEgress" (dict "ctx" $ctx "component" $component) | nindent 4 }}
    {{- include "liquio.networkPolicy.externalEgress" (dict "ctx" $ctx "component" $component) | nindent 4 }}
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
    # External PostgreSQL: restrict to port only, link-local excluded
    - to:
        {{- include "liquio.networkPolicy.anyIPv4" . | nindent 8 }}
      ports:
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
    # External Redis: restrict to port only, link-local excluded
    - to:
        {{- include "liquio.networkPolicy.anyIPv4" . | nindent 8 }}
      ports:
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
    # External RabbitMQ: restrict to port only, link-local excluded
    - to:
        {{- include "liquio.networkPolicy.anyIPv4" . | nindent 8 }}
      ports:
        - port: {{ $ctx.Values.config.rabbitmq.port | int }}
          protocol: TCP
    {{- end }}
    {{- end }}
    {{- if $ctx.Values.networkPolicy.egress.smtp.enabled }}
    # SMTP relay: port only, link-local excluded
    - to:
        {{- include "liquio.networkPolicy.anyIPv4" . | nindent 8 }}
      ports:
        - port: {{ $ctx.Values.networkPolicy.egress.smtp.port | int }}
          protocol: TCP
    {{- end }}
    {{- if $ctx.Values.networkPolicy.egress.sms.enabled }}
    # SMS gateway: port only, link-local excluded
    - to:
        {{- include "liquio.networkPolicy.anyIPv4" . | nindent 8 }}
      ports:
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
    # Liquio pods that call the gateway (from networkPolicy.serviceEdges)
    {{- range $src, $targets := $ctx.Values.networkPolicy.serviceEdges }}
    {{- if and (has "gateway" $targets) (index $ctx.Values.services (include "liquio.componentValuesKey" $src)).enabled }}
    - from:
        - podSelector:
            matchLabels:
              {{- include "liquio.selectorLabels" $ctx | nindent 14 }}
              app.kubernetes.io/component: {{ $src }}
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

{{/*
──────────────────────────────────────────────────────────────
liquio.componentValuesKey
  Maps a kebab-case component name to its key under .Values.services
──────────────────────────────────────────────────────────────
*/}}
{{- define "liquio.componentValuesKey" -}}
{{- $map := dict "id-api" "idApi" "admin-api" "adminApi" "cabinet-api" "cabinetApi" "id-front" "idFront" "external-reader" "externalReader" "persist-link" "persistLink" "pdf-generator" "pdfGenerator" "sign-tool" "signTool" "admin-front" "adminFront" "cabinet-front" "cabinetFront" -}}
{{- get $map . | default . -}}
{{- end -}}

{{/*
──────────────────────────────────────────────────────────────
liquio.networkPolicy.serviceEgress
  Args: dict "ctx" . "component" "<name>"
  One egress rule per target in networkPolicy.serviceEdges.<component>.
  Targets that are disabled are skipped. The port is the pod containerPort
  (policies are evaluated after the Service DNAT).
──────────────────────────────────────────────────────────────
*/}}
{{- define "liquio.networkPolicy.serviceEgress" -}}
{{- $ctx := .ctx -}}
{{- range $target := (index $ctx.Values.networkPolicy.serviceEdges .component | default list) }}
{{- $svc := index $ctx.Values.services (include "liquio.componentValuesKey" $target) }}
{{- if $svc.enabled }}
- to:
    - podSelector:
        matchLabels:
          {{- include "liquio.selectorLabels" $ctx | nindent 10 }}
          app.kubernetes.io/component: {{ $target }}
  ports:
    - port: {{ $svc.containerPort | default 8080 | int }}
      protocol: TCP
{{- end }}
{{- end }}
{{- end -}}

{{/*
──────────────────────────────────────────────────────────────
liquio.networkPolicy.anyIPv4
  Peer list for "any IPv4 address except link-local" (cloud metadata).
──────────────────────────────────────────────────────────────
*/}}
{{- define "liquio.networkPolicy.anyIPv4" -}}
- ipBlock:
    cidr: 0.0.0.0/0
    except:
      - 169.254.0.0/16
{{- end -}}

{{/*
──────────────────────────────────────────────────────────────
liquio.networkPolicy.cidrExcept
  Arg: CIDR string. Prints the link-local ranges (one per line) that must be
  excepted from it, prints nothing when none apply, and fails when the CIDR
  lies inside link-local space or is the AWS IPv6 metadata address.
──────────────────────────────────────────────────────────────
*/}}
{{- define "liquio.networkPolicy.cidrExcept" -}}
{{- $cidr := . | toString | lower -}}
{{- $pows := list 1 2 4 8 16 32 64 128 256 512 1024 2048 4096 8192 16384 32768 65536 -}}
{{- $parts := splitList "/" $cidr -}}
{{- if ne (len $parts) 2 -}}
{{- fail (printf "networkPolicy.egress.external: invalid CIDR %q (expected addr/prefix)" $cidr) -}}
{{- end -}}
{{- $addr := index $parts 0 -}}
{{- $p := atoi (index $parts 1) -}}
{{- if contains ":" $addr -}}
{{- /* IPv6 */ -}}
{{- $h := splitList ":" $addr -}}
{{- $h1 := 0 -}}
{{- if index $h 0 }}{{ $h1 = int (print "0x" (index $h 0)) }}{{ end -}}
{{- $h2 := 0 -}}
{{- if and (gt (len $h) 1) (index $h 1) }}{{ $h2 = int (print "0x" (index $h 1)) }}{{ end -}}
{{- if ge $p 10 -}}
{{- if eq (div $h1 64) (div 65152 64) -}}
{{- fail (printf "networkPolicy.egress.external: CIDR %s lies inside link-local fe80::/10, which is never allowed" $cidr) -}}
{{- end -}}
{{- end -}}
{{- $coversLL := false -}}
{{- if lt $p 10 -}}
{{- $sh := index $pows (sub 16 $p | int) -}}
{{- $coversLL = eq (div $h1 $sh) (div 65152 $sh) -}}
{{- end -}}
{{- $coversMeta := false -}}
{{- if le $p 16 -}}
{{- $sh := index $pows (sub 16 $p | int) -}}
{{- $coversMeta = eq (div $h1 $sh) (div 64768 $sh) -}}
{{- else if le $p 32 -}}
{{- $sh := index $pows (sub 32 $p | int) -}}
{{- $coversMeta = eq (div (add (mul $h1 65536) $h2) $sh) (div (add (mul 64768 65536) 3778) $sh) -}}
{{- else if and (eq $h1 64768) (eq $h2 3778) -}}
{{- /* inside fd00:ec2::/32: refuse anything that could include fd00:ec2::254 */ -}}
{{- $rest := slice $h 2 -}}
{{- $zero := true -}}
{{- range $x := $rest }}{{ if and $x (ne (trimAll "0" $x) "") }}{{ if ne $x "254" }}{{ $zero = false }}{{ end }}{{ end }}{{ end -}}
{{- if or (and (lt $p 128) $zero) (and (eq $p 128) (eq (join ":" $rest) ":254")) (and (eq $p 128) (eq (join ":" $rest) ":0:0:0:0:254")) (and (eq $p 128) (eq (join ":" $rest) ":0:0:0:0:0:254")) -}}
{{- fail (printf "networkPolicy.egress.external: CIDR %s covers or equals fd00:ec2::254, which is never allowed" $cidr) -}}
{{- end -}}
{{- end -}}
{{- if $coversLL }}
fe80::/10
{{- end }}
{{- if $coversMeta }}
fd00:ec2::254/128
{{- end }}
{{- else -}}
{{- /* IPv4 */ -}}
{{- $o := splitList "." $addr -}}
{{- $o1 := atoi (index $o 0) -}}
{{- $o2 := atoi (index $o 1) -}}
{{- if ge $p 16 -}}
{{- if and (eq $o1 169) (eq $o2 254) -}}
{{- fail (printf "networkPolicy.egress.external: CIDR %s lies inside link-local 169.254.0.0/16, which is never allowed" $cidr) -}}
{{- end -}}
{{- else -}}
{{- $sh := index $pows (sub 16 $p | int) -}}
{{- if eq (div (add (mul $o1 256) $o2) $sh) (div (add (mul 169 256) 254) $sh) }}
169.254.0.0/16
{{- end -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/*
──────────────────────────────────────────────────────────────
liquio.networkPolicy.externalEgress
  Args: dict "ctx" . "component" "<name>"
  Opt-in egress to IP ranges from networkPolicy.egress.external.<component>,
  each { cidr, ports }. Link-local ranges are always excepted or refused.
──────────────────────────────────────────────────────────────
*/}}
{{- define "liquio.networkPolicy.externalEgress" -}}
{{- $ctx := .ctx -}}
{{- range $rule := (index $ctx.Values.networkPolicy.egress.external .component | default list) }}
{{- $except := splitList "\n" (include "liquio.networkPolicy.cidrExcept" $rule.cidr | trim) | compact }}
- to:
    - ipBlock:
        cidr: {{ $rule.cidr }}
        {{- if $except }}
        except:
          {{- range $except }}
          - {{ . }}
          {{- end }}
        {{- end }}
  {{- if $rule.ports }}
  ports:
    {{- range $rule.ports }}
    - port: {{ . | int }}
      protocol: TCP
    {{- end }}
  {{- end }}
{{- end }}
{{- end -}}
