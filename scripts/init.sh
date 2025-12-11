#!/bin/sh

# Change directory to the script's location
cd "$(dirname "$0")/.."

# Make sure that jq is installed
if ! command -v jq >/dev/null 2>&1; then
  echo "jq is not installed. Please install jq to run this script."
  exit 1
fi

# Make sure that openssl is installed
if ! command -v openssl >/dev/null 2>&1; then
  echo "openssl is not installed. Please install openssl to run this script."
  exit 1
fi

# Read command line arguments
FORCE=0
for arg in "$@"; do
  case "$arg" in
    -f|--force)
      FORCE=1
      ;;
  esac
done

# Remove existing config directory if FORCE is set
if [ $FORCE -eq 1 ] && [ -d "./config" ]; then
  echo "Force option is set. Removing existing config directory."
  rm -rf ./config
  rm -f .env
fi

# Check if config directory already exists
if [ -d "./config" ]; then
  echo "Config directory already exists. Initialization cancelled. Use -f or --force to overwrite." >&2
  exit 1
fi

generate_secret() {
  local length="${1:-32}"
  openssl rand -base64 $length | tr -d '/+='
}

echo "==> Copy configuration templates"
cp -r ./config-templates ./config

echo "==> Create .env file with service ports"
cat <<EOF > .env
# Public service ports
SVC_ID_PORT=8080
SVC_CABINET_FRONT_PORT=8081
SVC_ADMIN_FRONT_PORT=8082
SVC_ID_API_PORT=8100
SVC_CABINET_API_PORT=8101
SVC_ADMIN_API_PORT=8102
SVC_REGISTER_PORT=8103
SVC_EXTERNAL_READER_PORT=8104
SVC_FILESTORAGE_PORT=8105
SVC_PDF_GENERATOR_PORT=7007

# Internal service ports
SVC_TASK_PORT=3000
SVC_GATEWAY_PORT=3001
SVC_MANAGER_PORT=3002
SVC_NOTIFICATION_PORT=3003
SVC_SIGN_TOOL_PORT=3004
EOF

echo "==> Append .env file with default database"
echo "" >> .env
cat <<EOF >> .env
# PostgreSQL database configuration
POSTGRES_DB=postgres
POSTGRES_NAME=postgres
POSTGRES_USER=postgres
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
EOF

echo "==> Generate a random PostgreSQL password and append it to .env"
echo "POSTGRES_PASSWORD=$(generate_secret)" >> .env

echo "==> Append .env with RabbitMQ configuration"
echo "" >> .env
echo "# RabbitMQ configuration" >> .env
echo "RABBITMQ_HOST=rabbitmq" >> .env
echo "RABBITMQ_PORT=5672" >> .env
echo "RABBITMQ_DEFAULT_USER=guest" >> .env

echo "==> Generate a random RabbitMQ password and append it to .env"
echo "RABBITMQ_DEFAULT_PASS=$(generate_secret)" >> .env

# Import environment variables from .env file
export $(grep -v '^#' .env | xargs)

{
  echo "==> Insert database credentials into config files"

  file="config/admin-api/db.json"
  echo "$file"
  jq --arg db "bpmn" \
    --arg user "$POSTGRES_USER" \
    --arg pass "$POSTGRES_PASSWORD" \
    --arg host "$POSTGRES_HOST" \
    --arg port "$POSTGRES_PORT" \
    '.database = $db | .username = $user | .password = $pass | .host = $host | .port = ($port|tonumber)' \
    $file > $file.tmp && mv $file.tmp $file

  file="config/cabinet-api/db.json"
  echo "$file"
  jq --arg db "bpmn" \
    --arg user "$POSTGRES_USER" \
    --arg pass "$POSTGRES_PASSWORD" \
    --arg host "$POSTGRES_HOST" \
    --arg port "$POSTGRES_PORT" \
    '.database = $db | .username = $user | .password = $pass | .host = $host | .port = ($port|tonumber)' \
    $file > $file.tmp && mv $file.tmp $file

  file="config/event/db.json"
  echo "$file"
  jq --arg db "bpmn" \
    --arg user "$POSTGRES_USER" \
    --arg pass "$POSTGRES_PASSWORD" \
    --arg host "$POSTGRES_HOST" \
    --arg port "$POSTGRES_PORT" \
    '.database = $db | .username = $user | .password = $pass | .host = $host | .port = ($port|tonumber)' \
    $file > $file.tmp && mv $file.tmp $file

  file="config/gateway/db.json"
  echo "$file"
  jq --arg db "bpmn" \
    --arg user "$POSTGRES_USER" \
    --arg pass "$POSTGRES_PASSWORD" \
    --arg host "$POSTGRES_HOST" \
    --arg port "$POSTGRES_PORT" \
    '.database = $db | .username = $user | .password = $pass | .host = $host | .port = ($port|tonumber)' \
    $file > $file.tmp && mv $file.tmp $file

  file="config/id/config.json"
  echo "$file"
  jq --arg db "id" \
    --arg user "$POSTGRES_USER" \
    --arg pass "$POSTGRES_PASSWORD" \
    --arg host "$POSTGRES_HOST" \
    --arg port "$POSTGRES_PORT" \
    '.production.db.database = $db | .production.db.username = $user | .production.db.password = $pass | .production.db.host = $host | .production.db.port = ($port|tonumber)' \
    $file > $file.tmp && mv $file.tmp $file

  file="config/manager/db.json"
  echo "$file"
  jq --arg db "bpmn" \
    --arg user "$POSTGRES_USER" \
    --arg pass "$POSTGRES_PASSWORD" \
    --arg host "$POSTGRES_HOST" \
    --arg port "$POSTGRES_PORT" \
    '.database = $db | .username = $user | .password = $pass | .host = $host | .port = ($port|tonumber)' \
    $file > $file.tmp && mv $file.tmp $file

  file="config/notification/config.json"
  echo "$file"
  jq --arg db "notify" \
    --arg user "$POSTGRES_USER" \
    --arg pass "$POSTGRES_PASSWORD" \
    --arg host "$POSTGRES_HOST" \
    --arg port "$POSTGRES_PORT" \
    '.production.db.database = $db | .production.db.username = $user | .production.db.password = $pass | .production.db.host = $host | .production.db.port = ($port|tonumber)' \
    $file > $file.tmp && mv $file.tmp $file

  file="config/register/db.json"
  echo "$file"
  jq --arg db "register" \
    --arg user "$POSTGRES_USER" \
    --arg pass "$POSTGRES_PASSWORD" \
    --arg host "$POSTGRES_HOST" \
    --arg port "$POSTGRES_PORT" \
    '.database = $db | .username = $user | .password = $pass | .host = $host | .port = ($port|tonumber)' \
    $file > $file.tmp && mv $file.tmp $file

  file="config/task/db.json"
  echo "$file"
  jq --arg db "bpmn" \
    --arg user "$POSTGRES_USER" \
    --arg pass "$POSTGRES_PASSWORD" \
    --arg host "$POSTGRES_HOST" \
    --arg port "$POSTGRES_PORT" \
    '.database = $db | .username = $user | .password = $pass | .host = $host | .port = ($port|tonumber)' \
    $file > $file.tmp && mv $file.tmp $file

  file="config/filestorage/db.json"
  echo "$file"
  jq --arg db "filestorage" \
    --arg user "$POSTGRES_USER" \
    --arg pass "$POSTGRES_PASSWORD" \
    --arg host "$POSTGRES_HOST" \
    --arg port "$POSTGRES_PORT" \
    '.database = $db | .username = $user | .password = $pass | .host = $host | .port = ($port|tonumber)' \
    $file > $file.tmp && mv $file.tmp $file
}

{
  echo "==> Insert RabbitMQ credentials into config files"
  RABBITMQ_CONNECTION_STRING="amqp://${RABBITMQ_DEFAULT_USER}:${RABBITMQ_DEFAULT_PASS}@${RABBITMQ_HOST}:${RABBITMQ_PORT}/"

  file="config/admin-api/message_queue.json"
  echo "$file"
  jq --arg conn "$RABBITMQ_CONNECTION_STRING" \
    '.amqpConnection = $conn' \
    $file > $file.tmp && mv $file.tmp $file

  file="config/event/message_queue.json"
  echo "$file"
  jq --arg conn "$RABBITMQ_CONNECTION_STRING" \
    '.amqpConnection = $conn' \
    $file > $file.tmp && mv $file.tmp $file

  file="config/gateway/message_queue.json"
  echo "$file"
  jq --arg conn "$RABBITMQ_CONNECTION_STRING" \
    '.amqpConnection = $conn' \
    $file > $file.tmp && mv $file.tmp $file

  file="config/manager/message_queue.json"
  echo "$file"
  jq --arg conn "$RABBITMQ_CONNECTION_STRING" \
    '.amqpConnection = $conn' \
    $file > $file.tmp && mv $file.tmp $file

  file="config/task/message_queue.json"
  echo "$file"
  jq --arg conn "$RABBITMQ_CONNECTION_STRING" \
    '.amqpConnection = $conn' \
    $file > $file.tmp && mv $file.tmp $file

  file="config/id/config.json"
  echo "$file"
  jq --arg secret "$(generate_secret)" \
    '.production.session.secret_key = $secret' \
    $file > $file.tmp && mv $file.tmp $file
}

echo "==> Generate a random secret for OAuth in ID service"
OAUTH_SECRET=$(generate_secret)
file="config/id/config.json"
jq --arg secret "$OAUTH_SECRET" \
  '.production.oauth.secret_key = [$secret]' \
  $file > $file.tmp && mv $file.tmp $file

{
  echo "==> Insert OAuth secret into config files"

  file="config/admin-api/auth.json"
  echo "$file"
  jq --arg secret "$OAUTH_SECRET" \
    '.basicAuthToken = $secret' \
    $file > $file.tmp && mv $file.tmp $file

  file="config/cabinet-api/auth.json"
  echo "$file"
  jq --arg secret "$OAUTH_SECRET" \
    '.LiquioId.basicAuthToken = $secret' \
    $file > $file.tmp && mv $file.tmp $file

  file="config/task/auth.json"
  echo "$file"
  jq --arg secret "$OAUTH_SECRET" \
    '.LiquioId.basicAuthToken = $secret' \
    $file > $file.tmp && mv $file.tmp $file
}

echo "==> Generate a random secret for JWT in ID service"
JWT_SECRET=$(generate_secret)
file="config/id/config.json"
jq --arg secret "$JWT_SECRET" \
  '.production.jwt.secret = $secret' \
  $file > $file.tmp && mv $file.tmp $file

{
  echo "==> Insert JWT secret into config files"

  file="config/admin-api/auth.json"
  echo "$file"
  jq --arg secret "$JWT_SECRET" \
    '.jwtSecret = $secret' \
    $file > $file.tmp && mv $file.tmp $file

  file="config/cabinet-api/auth.json"
  echo "$file"
  jq --arg secret "$JWT_SECRET" \
    '.jwtSecret = $secret' \
    $file > $file.tmp && mv $file.tmp $file

  file="config/task/auth.json"
  echo "$file"
  jq --arg secret "$JWT_SECRET" \
    '.jwtSecret = $secret' \
    $file > $file.tmp && mv $file.tmp $file
}

echo "==> Generate an encryption key for Register service"
file="config/register/encryption.json"
jq --arg key "$(generate_secret)" \
  '.key = $key' \
  $file > $file.tmp && mv $file.tmp $file

{
  echo "==> Generate access tokens for Register service"
  token="Basic $(echo register:${generate_secret} | base64 | tr -d '\n')"

  file="config/register/auth.json"
  echo "$file"
  jq --arg token "$token" \
    '.tokens = [$token]' \
    $file > $file.tmp && mv $file.tmp $file

  file="config/admin-api/register.json"
  echo "$file"
  jq --arg port "$SVC_REGISTER_PORT" \
    --arg server "http://register" \
    --arg token "$token" \
    '.port = $port | .server = $server | .token = $token' \
    $file > $file.tmp && mv $file.tmp $file

  file="config/task/register.json"
  echo "$file"
  jq --arg port "$SVC_REGISTER_PORT" \
    --arg server "http://register" \
    --arg token "$token" \
    '.port = $port | .server = $server | .token = $token' \
    $file > $file.tmp && mv $file.tmp $file

  file="config/event/requester.json"
  echo "$file"
  jq --arg url "http://register:$SVC_REGISTER_PORT" \
    --arg token "$token" \
    '.registers.url = $url | .registers.token = $token' \
    $file > $file.tmp && mv $file.tmp $file

}

{
  echo "==> Generate access tokens for External Reader service"
  login="external-reader"
  password=$(generate_secret)

  file="config/external-reader/auth.json"
  echo "$file"
  jq --arg login "$login" \
    --arg password "$password" \
    '.basicAuthTokens = [$login + ":" + $password]' \
    $file > $file.tmp && mv $file.tmp $file

  token="Basic $(echo -n "$login:$password" | base64 -w0)"
  file="config/task/external_reader.json"
  echo "$file"
  jq --arg token "$token" \
    --arg port "$SVC_EXTERNAL_READER_PORT" \
    --arg server "http://external-reader" \
    '.url = $server + ":" + $port | .basicAuthToken = $token' \
    $file > $file.tmp && mv $file.tmp $file
}

{
  echo "==> Configure PDF Generator service"
  login="pdf-generator"
  password=$(generate_secret)

  file="config/pdf-generator/auth.json"
  echo "$file"
  token="Basic $(echo -n "$login:$password" | base64 -w0)"
  jq --arg token "$token" \
    '.basicAuthTokens = [$token]' \
    $file > $file.tmp && mv $file.tmp $file

  file="config/pdf-generator/server.json"
  echo "$file"
  jq --arg port "$SVC_PDF_GENERATOR_PORT" \
    '.port = ($port|tonumber)' \
    $file > $file.tmp && mv $file.tmp $file

  file="config/task/pdf_generator.json"
  echo "$file"
  jq --arg token "$token" \
    --arg port "$SVC_PDF_GENERATOR_PORT" \
    --arg server "http://pdf-generator" \
    '.url = $server + ":" + $port + "/pdf" | .basicAuthToken = $token | .requestTimeout = 120000' \
    $file > $file.tmp && mv $file.tmp $file
}

{
  echo "==> Generate access tokens for File Storage service"
  token="Basic $(echo -n "filestorage:$(generate_secret)" | base64 -w0)"

  file="config/filestorage/auth.json"
  echo "$file"
  jq --arg token "$token" \
    '.tokens = [$token]' \
    $file > $file.tmp && mv $file.tmp $file

  file="config/task/filestorage.json"
  echo "$file"
  jq --arg token "$token" \
    --arg port "$SVC_FILESTORAGE_PORT" \
    --arg server "http://filestorage" \
    '.apiHost = $server + ":" + $port | .token = $token' \
    $file > $file.tmp && mv $file.tmp $file

  file="config/task/storage.json"
  echo "$file"
  jq --arg token "$token" \
    --arg port "$SVC_FILESTORAGE_PORT" \
    --arg server "http://filestorage" \
    '.FileStorage.apiHost = $server + ":" + $port | .FileStorage.token = $token' \
    $file > $file.tmp && mv $file.tmp $file

  file="config/admin-api/filestorage.json"
  echo "$file"
  jq --arg token "$token" \
    --arg port "$SVC_FILESTORAGE_PORT" \
    --arg server "http://filestorage" \
    '.apiHost = $server + ":" + $port | .token = $token' \
    $file > $file.tmp && mv $file.tmp $file

  file="config/event/filestorage.json"
  echo "$file"
  jq --arg token "$token" \
    --arg port "$SVC_FILESTORAGE_PORT" \
    --arg server "http://filestorage" \
    '.apiHost = $server + ":" + $port | .token = $token' \
    $file > $file.tmp && mv $file.tmp $file
}

{
  echo "==> Generate access credentials for Notification service"
  server="http://notification"
  login="notification"
  password=$(generate_secret)
  login_hash=$(node -e 'process.stdout.write(require("crypto").createHmac("sha512", process.argv[1]).update(process.argv[2]).digest("hex").toUpperCase())' $login $password)
  token="Basic $login:$password"

  file="config/notification/config.json"
  echo "$file"
  jq --arg login "$login_hash" \
    --arg hash "$password" \
    '.production.authorization.list = [{ user: $login, password: $hash }]' \
    $file > $file.tmp && mv $file.tmp $file

  file="config/admin-api/notifier.json"
  echo "$file"
  jq --arg login "$login" \
    --arg hashedPassword "$password" \
    --arg server "$server" \
    '.user = $login | .hashedPassword = $hashedPassword | .server = $server' \
    $file > $file.tmp && mv $file.tmp $file

  file="config/task/notifier.json"
  echo "$file"
  jq --arg login "$login" \
    --arg hashedPassword "$password" \
    '.user = $login | .hashedPassword = $hashedPassword' \
    $file > $file.tmp && mv $file.tmp $file

  file="config/event/notifier.json"
  echo "$file"
  jq --arg login "$login" \
    --arg hashedPassword "$password" \
    --arg server "$server" \
    '.email.user = $login | .email.hashedPassword = $hashedPassword | .email.server = $server | .sms.user = $login | .sms.hashedPassword = $hashedPassword | .sms.server = $server' \
    $file > $file.tmp && mv $file.tmp $file

  file="config/event/system_notifier.json"
  echo "$file"
  jq --arg login "$login" \
    --arg hashedPassword "$password" \
    --arg server "$server" \
    '.email.user = $login | .email.hashedPassword = $hashedPassword | .email.server = $server' \
    $file > $file.tmp && mv $file.tmp $file

  file="config/gateway/system_notifier.json"
  echo "$file"
  jq --arg login "$login" \
    --arg hashedPassword "$password" \
    --arg server "$server" \
    '.email.user = $login | .email.hashedPassword = $hashedPassword | .email.server = $server' \
    $file > $file.tmp && mv $file.tmp $file

  file="config/manager/system_notifier.json"
  echo "$file"
  jq --arg login "$login" \
    --arg hashedPassword "$password" \
    --arg server "$server" \
    '.email.user = $login | .email.hashedPassword = $hashedPassword | .email.server = $server' \
    $file > $file.tmp && mv $file.tmp $file

  file="config/id/config.json"
  echo "$file"
  jq --arg token "$token" \
    '.production.notify.authorization = $token' \
    $file > $file.tmp && mv $file.tmp $file
}

{
  echo "==> Generate CA certificate and private key"
  mkdir -p config/certificates
  openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout config/certificates/ca.key \
    -out config/certificates/ca.crt \
    -subj "/C=UA/L=Kyiv/O=Liquio/OU=Development/CN=Liquio" \

  echo "==> Insert CA certificate into config files"
  file="config/sign-tool/x509.json"
  jq --arg ca "$(cat config/certificates/ca.crt)" \
    '.caCerts = [$ca]' \
    $file > $file.tmp && mv $file.tmp $file

  echo "==> Generate a pk12 for admin user"
  ./scripts/generate-user.sh --first-name "Admin" --last-name "Liquio" --serial-number "0000000001" --password "admin" --output "config/admin.p12"

  echo "==> Generate a pk12 for demo user"
  ./scripts/generate-user.sh --first-name "Demo" --last-name "Liquio" --serial-number "3123456789" --password "demo" --output "config/demo.p12"
}

{
  echo "==> Update ping.json with Docker service endpoints"
  file="config/task/ping.json"
  echo "$file"
  jq --arg id_port "$SVC_ID_API_PORT" \
    --arg event_port "$SVC_TASK_PORT" \
    --arg manager_port "$SVC_MANAGER_PORT" \
    --arg gateway_port "$SVC_GATEWAY_PORT" \
    --arg register_port "$SVC_REGISTER_PORT" \
    --arg filestorage_port "$SVC_FILESTORAGE_PORT" \
    --arg notification_port "$SVC_NOTIFICATION_PORT" \
    --arg external_reader_port "$SVC_EXTERNAL_READER_PORT" \
    --arg sign_tool_port "$SVC_SIGN_TOOL_PORT" \
    --arg cabinet_front_port "$SVC_CABINET_FRONT_PORT" \
    --arg admin_front_port "$SVC_ADMIN_FRONT_PORT" \
    '.id.url = "http://id-api:" + $id_port + "/test/ping" |
     .eds.url = "http://sign-tool:" + $sign_tool_port + "/api/v1/test/ping" |
     .event.url = "http://task:" + $event_port + "/test/ping" |
     .manager.url = "http://manager:" + $manager_port + "/test/ping" |
     .gateway.url = "http://gateway:" + $gateway_port + "/test/ping" |
     .workflow.url = "http://manager:" + $manager_port + "/test/ping" |
     .register.url = "http://register:" + $register_port + "/test/ping" |
     .filestorage.url = "http://filestorage:" + $filestorage_port + "/test/ping" |
     .externalReader.url = "http://external-reader:" + $external_reader_port + "/test/ping" |
     .notification.url = "http://notification:" + $notification_port + "/test/ping" |
     .front.url = "http://cabinet-front:" + $cabinet_front_port + "/version.json" |
     .frontAdmin.url = "http://admin-front:" + $admin_front_port + "/version.json"' \
    $file > $file.tmp && mv $file.tmp $file
}
