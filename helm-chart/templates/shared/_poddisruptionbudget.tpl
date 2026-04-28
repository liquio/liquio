{{/*
══════════════════════════════════════════════════════════════
PodDisruptionBudget named template
══════════════════════════════════════════════════════════════

Accepts:
  dict
    "component"    — app.kubernetes.io/component label value (e.g. "id-api")
    "replicaCount" — numeric replica count for this service
    "context"      — standard Helm dot (.) for .Values / .Release / helpers

A PDB is only rendered when ALL of the following are true:
  1. .Values.podDisruptionBudget.enabled is true
  2. replicaCount >= 2  (a single-replica service cannot honour minAvailable: 1)
*/}}

{{- define "liquio.pdb" -}}
{{- $ctx := .context -}}
{{- $component := .component -}}
{{- $replicas := .replicaCount | int -}}
{{- if and $ctx.Values.podDisruptionBudget.enabled (ge $replicas 2) }}
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: {{ include "liquio.fullname" $ctx }}-{{ $component }}
  namespace: {{ include "liquio.namespace" $ctx }}
  labels:
    {{- include "liquio.labels" $ctx | nindent 4 }}
    app.kubernetes.io/component: {{ $component }}
spec:
  minAvailable: {{ $ctx.Values.podDisruptionBudget.minAvailable }}
  {{- if $ctx.Values.podDisruptionBudget.unhealthyPodEvictionPolicy }}
  unhealthyPodEvictionPolicy: {{ $ctx.Values.podDisruptionBudget.unhealthyPodEvictionPolicy }}
  {{- end }}
  selector:
    matchLabels:
      {{- include "liquio.selectorLabels" $ctx | nindent 6 }}
      app.kubernetes.io/component: {{ $component }}
{{- end }}
{{- end }}
