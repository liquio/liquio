{{/*
Individual database waiters
*/}}
{{- define "liquio.initContainer.waitForPostgres" -}}
- name: wait-for-postgres
  image: busybox:1.35
  command: ['sh', '-c']
  args:
    - |
      until nc -z {{ include "liquio.postgresql.host" . }} {{ .Values.config.database.port }}; do
        echo "Waiting for PostgreSQL to be ready..."
        sleep 5
      done
      echo "PostgreSQL is ready!"
  securityContext:
    runAsNonRoot: true
    runAsUser: 65534
    readOnlyRootFilesystem: true
    allowPrivilegeEscalation: false
    capabilities:
      drop:
      - ALL
    seccompProfile:
      type: RuntimeDefault
  volumeMounts:
    - name: tmp
      mountPath: /tmp
  resources:
    {{- toYaml .Values.initContainerResources | nindent 4 }}
{{- end -}}

{{- define "liquio.initContainer.waitForRabbitmq" -}}
- name: wait-for-rabbitmq
  image: busybox:1.35
  command: ['sh', '-c']
  args:
    - |
      until nc -z {{ include "liquio.rabbitmq.host" . }} {{ .Values.config.rabbitmq.port }}; do
        echo "Waiting for RabbitMQ to be ready..."
        sleep 5
      done
      echo "RabbitMQ is ready!"
  securityContext:
    runAsNonRoot: true
    runAsUser: 65534
    readOnlyRootFilesystem: true
    allowPrivilegeEscalation: false
    capabilities:
      drop:
      - ALL
    seccompProfile:
      type: RuntimeDefault
  volumeMounts:
    - name: tmp
      mountPath: /tmp
  resources:
    {{- toYaml .Values.initContainerResources | nindent 4 }}
{{- end -}}

{{- define "liquio.initContainer.waitForRedis" -}}
- name: wait-for-redis
  image: busybox:1.35
  command: ['sh', '-c']
  args:
    - |
      until nc -z {{ include "liquio.redis.host" . }} {{ .Values.config.redis.port }}; do
        echo "Waiting for Redis to be ready..."
        sleep 5
      done
      echo "Redis is ready!"
  securityContext:
    runAsNonRoot: true
    runAsUser: 65534
    readOnlyRootFilesystem: true
    allowPrivilegeEscalation: false
    capabilities:
      drop:
      - ALL
    seccompProfile:
      type: RuntimeDefault
  volumeMounts:
    - name: tmp
      mountPath: /tmp
  resources:
    {{- toYaml .Values.initContainerResources | nindent 4 }}
{{- end -}}

{{/*
Init container to wait for a TCP service to be reachable.
Usage: {{ include "liquio.initContainer.waitForService" (dict "name" "sign-tool" "host" "liquio-sign-tool" "port" "3004" "Values" .Values) }}
*/}}
{{- define "liquio.initContainer.waitForService" -}}
- name: wait-for-{{ .name }}
  image: busybox:1.35
  command: ['sh', '-c']
  args:
    - |
      until nc -z {{ .host }} {{ .port }}; do
        echo "Waiting for {{ .name }} to be ready..."
        sleep 5
      done
      echo "{{ .name }} is ready!"
  securityContext:
    runAsNonRoot: true
    runAsUser: 65534
    readOnlyRootFilesystem: true
    allowPrivilegeEscalation: false
    capabilities:
      drop:
      - ALL
    seccompProfile:
      type: RuntimeDefault
  volumeMounts:
    - name: tmp
      mountPath: /tmp
  resources:
    {{- toYaml .Values.initContainerResources | nindent 4 }}
{{- end -}}

{{/*
Init container that runs `npm run plugin-installer` to install a component's
configured plugins into the shared plugins volume before the main container starts.
Usage: {{ include "liquio.initContainer.pluginInstaller" (dict "component" "task" "Values" .Values "Chart" .Chart) }}
*/}}
{{- define "liquio.initContainer.pluginInstaller" -}}
- name: plugin-installer
  image: {{ include "liquio.image" (dict "component" .component "Values" .Values "Chart" .Chart) }}
  imagePullPolicy: {{ include "liquio.imagePullPolicy" . }}
  command: ["npm", "run", "plugin-installer"]
  securityContext:
    {{- toYaml .Values.securityContext | nindent 4 }}
  resources:
    {{- toYaml .Values.pluginInstallerResources | nindent 4 }}
  env:
    - name: CONFIG_PATH
      value: "/var/www/config"
    - name: PLUGINS_INSTALL_DIR
      value: "/var/www/plugins"
    - name: SECRET_PATH
      value: {{ .Values.secrets.secretConfigPath | quote }}
    # npm's default cache dir is $HOME/.npm, which is not writable once
    # readOnlyRootFilesystem is set above - redirect it into the writable tmp mount.
    - name: npm_config_cache
      value: "/tmp/.npm"
    # Silence npm's own "new version available" notice, which has nothing to do
    # with whether the plugin install itself found/installed anything.
    - name: npm_config_update_notifier
      value: "false"
  volumeMounts:
    - name: config
      mountPath: /var/www/config
      readOnly: true
    - name: secret-config
      mountPath: {{ .Values.secrets.secretConfigPath }}
      readOnly: true
    - name: plugins
      mountPath: /var/www/plugins
    - name: tmp
      mountPath: /tmp
{{- end -}}

{{/*
Init container to wait for a specific migration job to complete
Usage: {{ include "liquio.initContainer.waitForMigrations" (dict "migrationJob" "id-migrations" "Context" .) }}
*/}}
{{- define "liquio.initContainer.waitForMigrations" -}}
- name: wait-for-migrations
  image: alpine/k8s:1.31.11
  command: ['sh', '-c']
  args:
    - |
      echo "Waiting for {{ .migrationJob }} to complete..."
      while true; do
        if ! kubectl get job {{ include "liquio.fullname" .Context }}-{{ .migrationJob }} 2>/dev/null; then
          echo "{{ .migrationJob | title }} job not found (already cleaned up, assuming success)."
          break
        elif kubectl get job {{ include "liquio.fullname" .Context }}-{{ .migrationJob }} -o jsonpath='{.status.conditions[?(@.type=="Complete")].status}' 2>/dev/null | grep -q "True"; then
          echo "{{ .migrationJob | title }} completed successfully!"
          break
        elif kubectl get job {{ include "liquio.fullname" .Context }}-{{ .migrationJob }} -o jsonpath='{.status.conditions[?(@.type=="Failed")].status}' 2>/dev/null | grep -q "True"; then
          echo "{{ .migrationJob | title }} failed!"
          exit 1
        else
          echo "{{ .migrationJob | title }} still running, waiting..."
          sleep 10
        fi
      done
  securityContext:
    runAsNonRoot: true
    runAsUser: 65534
    readOnlyRootFilesystem: true
    allowPrivilegeEscalation: false
    capabilities:
      drop:
      - ALL
    seccompProfile:
      type: RuntimeDefault
  volumeMounts:
    - name: tmp
      mountPath: /tmp
  resources:
    {{- toYaml .Context.Values.initContainerResources | nindent 4 }}
{{- end -}}
