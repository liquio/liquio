{{/*
Render a JSON config payload by deep-merging service override values.
Expected values path: config.<service>.<config>
*/}}
{{- define "liquio.renderJsonConfig" -}}
{{- $ctx := .ctx -}}
{{- $service := .service -}}
{{- $config := .config -}}
{{- $base := .base | default (dict) -}}
{{- $serviceConfig := default (dict) (index $ctx.Values.config $service) -}}
{{- $configWithoutExt := trimSuffix ".json" $config -}}
{{- $override := dict -}}
{{- if hasKey $serviceConfig $config -}}
  {{- $override = default (dict) (index $serviceConfig $config) -}}
{{- else if hasKey $serviceConfig $configWithoutExt -}}
  {{- $override = default (dict) (index $serviceConfig $configWithoutExt) -}}
{{- end -}}
{{- mergeOverwrite (deepCopy $base) $override | toPrettyJson -}}
{{- end }}

{{/*
Email confirmation HTML template for id-api.
Defined as a named template rather than an inline string because it contains
literal {{ }} mustache expressions that cannot be embedded inside a Go template
string argument (i.e. inside a dict "key" "value" call).
*/}}
{{- define "liquio.id-confirmCodeEmailTemplate" -}}
<!DOCTYPE html> <html lang="en"> <head> <meta charset="UTF-8"> <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"/> </head> <body style="font-size: 12px;margin: 0;font-family: Arial, Helvetica, sans-serif;line-height: 1;letter-spacing: -0.02em;padding-top: 20px;padding-bottom: 50px;"> <div style="padding-left: 50px;padding-right: 50px;"> <div style="margin-bottom: 50px;"> <img style="height: 48px;float: left;" src="https://i.ibb.co/ZYbFkwT/image.png" alt="image" /> <div style="font-size: 16px;line-height: 20px;padding-left: 15px;max-width: 80px;display: inline-block;margin-top: 5px;"> Liquio </div> </div> <div style="font-size: 21px;font-weight: bold;line-height: 26px;margin-bottom: 20px;letter-spacing: -0.02em;"> Email confirmation code: </div> <div style="font-size: 16px;line-height: 20px;color: #000;margin-top: 20px;margin-bottom: 20px;"> <div style="font-size: 20px;"></div> {{ "{{" }}code{{ "}}" }} </div> </div> <div style="background-color: #000;padding-top: 20px;padding-bottom: 80px;font-size: 10px;margin-top: 40px;"> <div style="padding-left: 50px;padding-right: 50px;"> <div style="color: #fff;margin-bottom: 5px;">1 Platform Street, City</div> <div style="color: #fff;margin-bottom: 20px;">Country</div> </div> </div> </body> </html>
{{- end }}

{{/*
Return the shared PostgreSQL db.json base dict.
Parameters:
  ctx      — the root template context (.)
  database — the database name string
  username — the database username (required; database-specific)
Default pool: max=5, min=1, acquire=30000, idle=10000
Use mergeOverwrite to customise pool or other fields after calling this.
Usage:
  {{- $dbBase := include "liquio.postgresDbBase" (dict "ctx" . "database" "bpmn" "username" .Values.config.database.username) | fromJson -}}
*/}}
{{- define "liquio.postgresDbBase" -}}
{{- $ctx := .ctx -}}
{{- $database := .database -}}
{{- $username := .username -}}
{{- dict
  "database" $database
  "dialect" "postgres"
  "dialectOptions" (dict
    "bigNumberStrings" true
    "socketPath" ""
    "supportBigNumbers" true
  )
  "host" (include "liquio.postgresql.host" $ctx)
  "logging" false
  "pool" (dict
    "acquire" 30000
    "idle" 10000
    "max" 5
    "min" 1
  )
  "port" $ctx.Values.config.database.port
  "username" $username
| toJson -}}
{{- end }}
