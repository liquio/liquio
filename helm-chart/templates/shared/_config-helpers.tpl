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
{{- $ctx := .ctx -}}
{{- $cabinetUrl := printf "%s://%s/" (include "liquio.scheme" $ctx) (include "liquio.publicHost" (dict "ctx" $ctx "service" "cabinet")) -}}
<!DOCTYPE html> <html lang="en"> <head> <meta charset="UTF-8"> <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"/> </head> <body style="font-size: 12px;margin: 0;font-family: Arial, Helvetica, sans-serif;line-height: 1;letter-spacing: -0.02em;padding-top: 20px;padding-bottom: 50px;"> <div style="padding-left: 50px;padding-right: 50px;"> <div style="margin-bottom: 50px;"> <a href="{{ $cabinetUrl }}" target="_blank" rel="noopener noreferrer" style="display: inline-block; text-decoration: none;"> <svg preserveAspectRatio="xMidYMid meet" data-bbox="20.045 12.528 99.726 33.339" xmlns="http://www.w3.org/2000/svg" viewBox="20.045 12.528 99.726 33.339" height="59" width="140" data-type="color" role="presentation" aria-hidden="true" aria-label="" style="display: block;"><defs><style>#comp-kbgakxmn_r_comp-mg0nxz1k svg [data-color="1"] {fill: #FFFFFF;}</style></defs><g><path fill="#616FFF" d="M63.248 20.018c.22 0 .379.208.323.42l-6.7 24.934a.67.67 0 0 1-.644.495h-4.299a.334.334 0 0 1-.322-.42l1.81-6.735a5.55 5.55 0 0 1-2.692.694c-5.35 0-9.689-4.34-9.689-9.694 0-5.353 4.338-9.693 9.689-9.693h7.715l-.001-.001zm7.853.002c.183 0 .333.148.333.333v8.96c0 2.744 2.115 5.04 4.918 5.087a5.005 5.005 0 0 0 5.09-5.005h.002v-9.042c0-.184.148-.333.333-.333h4.337c.183 0 .332.148.332.333v9.042c0 5.53-4.48 10.013-10.007 10.013s-10.007-4.483-10.007-10.013v-9.042c0-.184.148-.333.333-.333zm38.663-.639c5.527 0 10.007 4.483 10.007 10.014s-4.48 10.012-10.007 10.013-10.008-4.483-10.008-10.013 4.481-10.014 10.008-10.014m-70.7.692a.77.77 0 0 1 .745.971l-4.57 17.019a.67.67 0 0 1-.645.495h-4.298c-.22 0-.38-.21-.322-.422l.691-2.546h.002l4.027-15.021a.67.67 0 0 1 .645-.495zm58.875-.053c.22 0 .38.208.323.42l-4.718 17.57a.67.67 0 0 1-.645.493H88.6a.334.334 0 0 1-.323-.42l.693-2.547L93 20.514a.67.67 0 0 1 .645-.494zm-66.212-7.492c.22 0 .38.208.323.42l-6.728 25.06a.67.67 0 0 1-.645.494h-4.298c-.22 0-.38-.21-.322-.422l.692-2.544 6.034-22.514a.67.67 0 0 1 .645-.494zm78.037 11.86a5.006 5.006 0 0 0-5.004 5.007 5.006 5.006 0 0 0 5.004 5.007 5.006 5.006 0 0 0 5.003-5.007 5.006 5.006 0 0 0-5.003-5.007m-59.04-.001a5.006 5.006 0 0 0 0 10.013c2.489 0 4.018-1.096 4.937-4.199l1.564-5.814zm-9.08-11.806c.22 0 .379.21.322.421l-.926 3.45a.67.67 0 0 1-.644.495h-4.298a.334.334 0 0 1-.322-.42l.924-3.45a.67.67 0 0 1 .645-.496zm58.305-.053c.22 0 .379.208.323.42l-.927 3.45a.67.67 0 0 1-.645.495h-4.297a.334.334 0 0 1-.323-.421l.925-3.45a.67.67 0 0 1 .646-.494z" data-color="1"></path></g></svg> </a> </div> <div style="font-size: 21px;font-weight: bold;line-height: 26px;margin-bottom: 20px;letter-spacing: -0.02em;"> Email confirmation code: </div> <div style="font-size: 16px;line-height: 20px;color: #000;margin-top: 20px;margin-bottom: 20px;"> <div style="font-size: 20px;"></div> {{ "{{" }}code{{ "}}" }} </div> </div> </body> </html>
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
