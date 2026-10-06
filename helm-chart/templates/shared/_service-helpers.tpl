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
  "admin-api" "0.1.26"
  "admin-front" "0.1.39"
  "cabinet-api" "0.1.7"
  "cabinet-front" "0.1.52"
  "event" "0.1.16"
  "external-reader" "0.1.7"
  "filestorage" "0.1.5"
  "gateway" "0.1.8"
  "id-api" "0.1.21"
  "id-front" "0.1.7"
  "manager" "0.1.14"
  "notification" "0.1.10"
  "pdf-generator" "0.1.4"
  "persist-link" "0.1.11"
  "register" "0.1.9"
  "sign-tool" "0.1.2"
  "task" "0.1.36"
-}}
{{- if and (kindIs "map" $overrides) (hasKey $overrides $component) -}}
{{- index $overrides $component -}}
{{- else if hasKey $versions $component -}}
{{- index $versions $component -}}
{{- else -}}
{{- $fallback -}}
{{- end -}}
{{- end }}
