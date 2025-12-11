{{/*
Individual database waiters
*/}}
{{- define "liquio.initContainer.waitForPostgres" -}}
- name: wait-for-postgres
  image: busybox:1.35
  command: ['sh', '-c']
  args:
    - |
      until nc -z {{ include "liquio.fullname" . }}-postgresql 5432; do
        echo "Waiting for PostgreSQL to be ready..."
        sleep 5
      done
      echo "PostgreSQL is ready!"
  securityContext:
    readOnlyRootFilesystem: true
    allowPrivilegeEscalation: false
    capabilities:
      drop:
      - ALL
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
      until nc -z {{ include "liquio.fullname" . }}-rabbitmq 5672; do
        echo "Waiting for RabbitMQ to be ready..."
        sleep 5
      done
      echo "RabbitMQ is ready!"
  securityContext:
    readOnlyRootFilesystem: true
    allowPrivilegeEscalation: false
    capabilities:
      drop:
      - ALL
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
      until nc -z {{ include "liquio.fullname" . }}-redis-master 6379; do
        echo "Waiting for Redis to be ready..."
        sleep 5
      done
      echo "Redis is ready!"
  securityContext:
    readOnlyRootFilesystem: true
    allowPrivilegeEscalation: false
    capabilities:
      drop:
      - ALL
  volumeMounts:
    - name: tmp
      mountPath: /tmp
  resources:
    {{- toYaml .Values.initContainerResources | nindent 4 }}
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
        if kubectl get job {{ include "liquio.fullname" .Context }}-{{ .migrationJob }} -o jsonpath='{.status.conditions[?(@.type=="Complete")].status}' 2>/dev/null | grep -q "True"; then
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
    readOnlyRootFilesystem: true
    allowPrivilegeEscalation: false
    capabilities:
      drop:
      - ALL
  volumeMounts:
    - name: tmp
      mountPath: /tmp
  resources:
    {{- toYaml .Context.Values.initContainerResources | nindent 4 }}
{{- end -}}
