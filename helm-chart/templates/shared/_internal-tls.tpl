{{/*
Opt-in TLS for the notification and sign-tool listeners and their in-chart callers (SE-3930, ID-27c).
Everything here is inert unless internalTls.enabled=true, so the default render is unchanged.
The Secret (internalTls.secretName) holds ca.crt, tls.crt and tls.key (cert-manager layout). It is created outside this chart.
*/}}

{{/* "true" when internalTls.enabled is set, empty otherwise. */}}
{{- define "liquio.internalTls.enabled" -}}
{{- if and .Values.internalTls .Values.internalTls.enabled -}}true{{- end -}}
{{- end }}

{{/* "true" when internalTls.enabled and internalTls.mtls are both set. */}}
{{- define "liquio.internalTls.mtls" -}}
{{- if and (include "liquio.internalTls.enabled" .) .Values.internalTls.mtls -}}true{{- end -}}
{{- end }}

{{/* URL scheme for notification and sign-tool: https when internalTls.enabled, else http. */}}
{{- define "liquio.internalTls.scheme" -}}
{{- if include "liquio.internalTls.enabled" . -}}https{{- else -}}http{{- end -}}
{{- end }}

{{/* Mount directory of the TLS Secret inside the pods. */}}
{{- define "liquio.internalTls.mountPath" -}}/var/www/internal-tls{{- end }}

{{/* Secret name; fails the render when TLS is on and no secretName is given. */}}
{{- define "liquio.internalTls.secretName" -}}
{{- required "internalTls.secretName is required when internalTls.enabled=true (Secret with ca.crt, tls.crt, tls.key)" .Values.internalTls.secretName -}}
{{- end }}

{{/*
Volume for the TLS Secret.
Parameters: ctx (root), keys (list of Secret keys to project: "ca.crt", "tls.crt", "tls.key").
Only the listed keys are mounted, so a pod never receives a key it does not need.
*/}}
{{- define "liquio.internalTls.volume" -}}
- name: internal-tls
  secret:
    secretName: {{ include "liquio.internalTls.secretName" .ctx }}
    items:
      {{- range .keys }}
      - key: {{ . }}
        path: {{ . }}
      {{- end }}
{{- end }}

{{/* Volume mount for the TLS Secret. Parameter: the root context. */}}
{{- define "liquio.internalTls.volumeMount" -}}
- name: internal-tls
  mountPath: {{ include "liquio.internalTls.mountPath" . }}
  readOnly: true
{{- end }}

{{/*
tls block for the notification (conf.tls) and sign-tool (server.tls) listeners, as a JSON dict.
caPath turns on client-certificate checks (mTLS), so it is set only when internalTls.mtls=true.
*/}}
{{- define "liquio.internalTls.serverConfig" -}}
{{- $dir := include "liquio.internalTls.mountPath" . -}}
{{- $tls := dict "enabled" true "certPath" (printf "%s/tls.crt" $dir) "keyPath" (printf "%s/tls.key" $dir) -}}
{{- if include "liquio.internalTls.mtls" . -}}
{{- $_ := set $tls "caPath" (printf "%s/ca.crt" $dir) -}}
{{- end -}}
{{- $tls | toJson -}}
{{- end }}

{{/*
Client side config (JSON dict) for callers that have a CA option: id-api internalTransport, register sign.tls,
admin-api internal_transport. With mTLS, cert and key are added when clientCert is true (register, admin-api;
id-api has no client certificate option).
Parameters: ctx (root), clientCert (bool).
*/}}
{{- define "liquio.internalTls.clientConfig" -}}
{{- $dir := include "liquio.internalTls.mountPath" .ctx -}}
{{- $cfg := dict "ca" (printf "%s/ca.crt" $dir) -}}
{{- if and .clientCert (include "liquio.internalTls.mtls" .ctx) -}}
{{- $_ := set $cfg "cert" (printf "%s/tls.crt" $dir) -}}
{{- $_ := set $cfg "key" (printf "%s/tls.key" $dir) -}}
{{- end -}}
{{- $cfg | toJson -}}
{{- end }}

{{/* Secret keys a caller mounts: the CA, plus the client pair when mTLS is on and the caller can use it. */}}
{{- define "liquio.internalTls.clientKeys" -}}
{{- $keys := list "ca.crt" -}}
{{- if and .clientCert (include "liquio.internalTls.mtls" .ctx) -}}
{{- $keys = concat $keys (list "tls.crt" "tls.key") -}}
{{- end -}}
{{- $keys | toJson -}}
{{- end }}

{{/*
NODE_EXTRA_CA_CERTS env entry for callers without a CA option (task, event, manager, gateway).
Node reads this natively and adds the CA to every outgoing TLS connection. Renders nothing when TLS is off.
*/}}
{{- define "liquio.internalTls.extraCaEnv" -}}
- name: NODE_EXTRA_CA_CERTS
  value: {{ printf "%s/ca.crt" (include "liquio.internalTls.mountPath" .) | quote }}
{{- end }}
