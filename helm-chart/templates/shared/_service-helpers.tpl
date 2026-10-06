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
  "admin-api" "1.0.0"
  "admin-front" "1.0.0"
  "cabinet-api" "1.0.0"
  "cabinet-front" "1.0.0"
  "event" "1.0.0"
  "external-reader" "1.0.0"
  "filestorage" "1.0.0"
  "gateway" "1.0.0"
  "id-api" "1.0.0"
  "id-front" "1.0.0"
  "manager" "1.0.0"
  "notification" "1.0.0"
  "pdf-generator" "1.0.0"
  "persist-link" "1.0.0"
  "register" "1.0.0"
  "sign-tool" "1.0.0"
  "task" "1.0.0"
-}}
{{- if and (kindIs "map" $overrides) (hasKey $overrides $component) -}}
{{- index $overrides $component -}}
{{- else if hasKey $versions $component -}}
{{- index $versions $component -}}
{{- else -}}
{{- $fallback -}}
{{- end -}}
{{- end }}
