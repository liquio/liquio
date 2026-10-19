{{/*
Per-service image tag versions managed in chart templates.
*/}}
{{- define "liquio.imageRegistry" -}}
{{- $global := .Values.global | default dict -}}
{{- $image := .Values.image | default dict -}}
{{- $globalRegistry := index $global "imageRegistry" | default "" -}}
{{- $imageRegistry := index $image "registry" | default "" -}}
{{- $globalRegistry | default $imageRegistry | default "ghcr.io/liquio" -}}
{{- end }}

{{- define "liquio.imagePullPolicy" -}}
{{- $image := .Values.image | default dict -}}
{{- index $image "pullPolicy" | default "IfNotPresent" -}}
{{- end }}

{{- define "liquio.imageDefaultTag" -}}
{{- $image := .Values.image | default dict -}}
{{- index $image "tag" | default "0.1.0" -}}
{{- end }}

{{/*
Per-service image tag versions managed in chart templates.
*/}}
{{- define "liquio.serviceTag" -}}
{{- $component := .component -}}
{{- $fallback := include "liquio.imageDefaultTag" . -}}
{{- $overrides := .Values.serviceVersions | default dict -}}
{{- $versions := dict
  "admin-api" "1.0.2"
  "admin-front" "1.0.1"
  "cabinet-api" "1.0.2"
  "cabinet-front" "1.0.1"
  "event" "1.0.2"
  "external-reader" "1.0.1"
  "filestorage" "1.0.2"
  "gateway" "1.0.2"
  "id-api" "1.0.2"
  "id-front" "1.0.1"
  "manager" "1.0.2"
  "notification" "1.0.2"
  "pdf-generator" "1.0.1"
  "persist-link" "1.0.2"
  "register" "1.0.2"
  "sign-tool" "1.0.1"
  "task" "1.0.2"
-}}
{{- if and (kindIs "map" $overrides) (hasKey $overrides $component) -}}
{{- index $overrides $component -}}
{{- else if hasKey $versions $component -}}
{{- index $versions $component -}}
{{- else -}}
{{- $fallback -}}
{{- end -}}
{{- end }}
