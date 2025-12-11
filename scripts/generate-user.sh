#!/bin/sh

# Change directory to the script's location
cd "$(dirname "$0")/../"

# Make sure that openssl is installed
if ! command -v openssl >/dev/null 2>&1; then
  echo "openssl is not installed. Please install openssl to run this script."
  exit 1
fi

# Parse command line arguments
COMMON_NAME=""
FIRST_NAME=""
MIDDLE_NAME=""
LAST_NAME=""
SERIAL_NUMBER=""
PASSWORD=""
OUTPUT_FILE=""
CA_CERT_PATH=""
CA_KEY_PATH=""
K8S_SECRET_NAME=""

while [ $# -gt 0 ]; do
  case "$1" in
    --common-name)
      COMMON_NAME="$2"
      shift 2
      ;;
    --first-name)
      FIRST_NAME="$2"
      shift 2
      ;;
    --middle-name)
      MIDDLE_NAME="$2"
      shift 2
      ;;
    --last-name)
      LAST_NAME="$2"
      shift 2
      ;;
    --serial-number)
      SERIAL_NUMBER="$2"
      shift 2
      ;;
    --password)
      PASSWORD="$2"
      shift 2
      ;;
    --output)
      OUTPUT_FILE="$2"
      shift 2
      ;;
    --ca-cert)
      CA_CERT_PATH="$2"
      shift 2
      ;;
    --ca-key)
      CA_KEY_PATH="$2"
      shift 2
      ;;
    --k8s-secret)
      K8S_SECRET_NAME="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [--common-name <name>] [--first-name <name>] [--middle-name <name>] [--last-name <name>] [--serial-number <number>] [--password <password>] [--output <file>] [--ca-cert <path>] [--ca-key <path>] [--k8s-secret <secret-name>]"
      echo ""
      echo "Options:"
      echo "  --common-name <name>     Common name for the certificate (e.g., 'John Doe')"
      echo "  --first-name <name>      First name (given name) for the certificate"
      echo "  --middle-name <name>     Middle name or initial for the certificate"
      echo "  --last-name <name>       Last name (surname) for the certificate"
      echo "  --serial-number <number> Serial number for the certificate"
      echo "  --password <password>    Password for the p12 file (defaults to serial number)"
      echo "  --output <file>          Output file name for the p12 file (defaults to config/<serial_number>.p12)"
      echo "  --ca-cert <path>         Path to CA certificate file (defaults to config/certificates/ca.crt)"
      echo "  --ca-key <path>          Path to CA private key file (defaults to config/certificates/ca.key)"
      echo "  --k8s-secret <name>      Extract CA certificate and key from specified Kubernetes secret"
      echo "  -h, --help              Show this help message"
      echo ""
      echo "Note: You can use either --common-name OR the combination of --first-name, --middle-name, --last-name."
      echo "      If individual name components are provided, they will be used in separate certificate fields."
      exit 0
      ;;
    *)
      echo "Error: Unknown option $1"
      echo "Use --help for usage information."
      exit 1
      ;;
  esac
done

# Handle Kubernetes secret extraction if --k8s-secret flag is used
if [ -n "$K8S_SECRET_NAME" ]; then
  echo "==> Extracting CA certificate and key from Kubernetes secret: $K8S_SECRET_NAME"
  
  # Check if we have kubectl access
  if ! command -v kubectl >/dev/null 2>&1; then
    echo "Error: kubectl is not available or not configured"
    exit 1
  fi

  # Create temporary directory for CA files
  TEMP_DIR="/tmp/k8s-ca-extract-$$"
  mkdir -p "$TEMP_DIR"

  # Cleanup function
  cleanup_k8s() {
    rm -rf "$TEMP_DIR" 2>/dev/null || true
  }
  trap cleanup_k8s EXIT

  # Check if the specified secret exists
  if ! kubectl get secret "$K8S_SECRET_NAME" >/dev/null 2>&1; then
    echo "Error: Secret '$K8S_SECRET_NAME' not found."
    echo "Available secrets:"
    kubectl get secrets
    exit 1
  fi

  echo "==> Using CA secret: $K8S_SECRET_NAME"

  # Get the CA certificate
  kubectl get secret "$K8S_SECRET_NAME" -o jsonpath='{.data.ca\.crt}' | base64 -d > "$TEMP_DIR/ca.crt"
  if [ ! -s "$TEMP_DIR/ca.crt" ]; then
    echo "Error: Failed to fetch CA certificate from secret"
    exit 1
  fi

  # Get the CA private key
  kubectl get secret "$K8S_SECRET_NAME" -o jsonpath='{.data.ca\.key}' | base64 -d > "$TEMP_DIR/ca.key"
  if [ ! -s "$TEMP_DIR/ca.key" ]; then
    echo "Error: Failed to fetch CA private key from secret"
    exit 1
  fi

  # Override CA paths to use the extracted files
  CA_CERT_PATH="$TEMP_DIR/ca.crt"
  CA_KEY_PATH="$TEMP_DIR/ca.key"
  
  echo "==> CA certificate and key extracted successfully"
fi

# Check if CA certificate and key exist
# Allow custom CA paths via command line arguments or environment variables
CA_CERT_PATH="${CA_CERT_PATH:-config/certificates/ca.crt}"
CA_KEY_PATH="${CA_KEY_PATH:-config/certificates/ca.key}"

if [ ! -f "$CA_CERT_PATH" ] || [ ! -f "$CA_KEY_PATH" ]; then
  echo "CA certificate or key not found."
  echo "  Expected CA cert: $CA_CERT_PATH"
  echo "  Expected CA key: $CA_KEY_PATH"
  echo "Please run scripts/init.sh first to generate the CA, or use --ca-cert and --ca-key options."
  exit 1
fi

# Prompt for common name if not provided as argument
if [ -z "$COMMON_NAME" ] && [ -z "$FIRST_NAME" ] && [ -z "$LAST_NAME" ]; then
  echo "Enter the common name for the certificate (e.g., 'John Doe'):"
  echo "Or press Enter to provide individual name components:"
  read -r COMMON_NAME

  # If no common name provided, ask for individual components
  if [ -z "$COMMON_NAME" ]; then
    echo "Enter first name:"
    read -r FIRST_NAME
    echo "Enter middle name/initial (optional):"
    read -r MIDDLE_NAME
    echo "Enter last name:"
    read -r LAST_NAME
  fi
fi

# Validate that we have some form of name
if [ -z "$COMMON_NAME" ] && [ -z "$FIRST_NAME" ] && [ -z "$LAST_NAME" ]; then
  echo "Error: Must provide either a common name or at least a first or last name."
  exit 1
fi

# Prompt for serial number if not provided as argument
if [ -z "$SERIAL_NUMBER" ]; then
  echo "Enter the serial number:"
  read -r SERIAL_NUMBER
fi

# Set default output file if not provided
if [ -z "$OUTPUT_FILE" ]; then
  if [ -n "$K8S_SECRET_NAME" ]; then
    # For K8s mode, save to current directory
    OUTPUT_FILE="user-${SERIAL_NUMBER}.p12"
  else
    OUTPUT_FILE="config/${SERIAL_NUMBER}.p12"
  fi
fi

# Check if p12 file with this name already exists
if [ -f "$OUTPUT_FILE" ]; then
  echo "Error: A certificate file ${OUTPUT_FILE} already exists."
  exit 1
fi

# Prompt for password if not provided as argument
if [ -z "$PASSWORD" ]; then
  echo "Enter password for the p12 file (press Enter for default password same as serial number):"
  read -r PASSWORD
fi

# Use serial number as default password if none provided
if [ -z "$PASSWORD" ]; then
  PASSWORD="$SERIAL_NUMBER"
fi

# Build certificate subject
CERT_SUBJECT="/O=Liquio/serialNumber=${SERIAL_NUMBER}"

# If individual name components are provided, use them; otherwise use common name
if [ -n "$FIRST_NAME" ] || [ -n "$LAST_NAME" ]; then
  # Use individual name components
  if [ -n "$FIRST_NAME" ]; then
    CERT_SUBJECT="${CERT_SUBJECT}/GN=${FIRST_NAME}"
  fi

  if [ -n "$MIDDLE_NAME" ]; then
    CERT_SUBJECT="${CERT_SUBJECT}/initials=${MIDDLE_NAME}"
  fi

  if [ -n "$LAST_NAME" ]; then
    CERT_SUBJECT="${CERT_SUBJECT}/SN=${LAST_NAME}"
  fi

  # Build full name for CN and display
  if [ -z "$COMMON_NAME" ]; then
    COMMON_NAME=""
    [ -n "$FIRST_NAME" ] && COMMON_NAME="$FIRST_NAME"
    [ -n "$MIDDLE_NAME" ] && COMMON_NAME="$COMMON_NAME $MIDDLE_NAME"
    [ -n "$LAST_NAME" ] && COMMON_NAME="$COMMON_NAME $LAST_NAME"
    COMMON_NAME=$(echo "$COMMON_NAME" | sed 's/^ *//' | sed 's/ *$//')  # trim spaces
  fi

  CERT_SUBJECT="${CERT_SUBJECT}/CN=${COMMON_NAME}"
else
  # Use the common name approach (backward compatibility)
  CERT_SUBJECT="${CERT_SUBJECT}/CN=${COMMON_NAME}"
fi

echo "==> Generating certificate for ${COMMON_NAME} with serial number ${SERIAL_NUMBER}"

# Ensure certificates directory exists
mkdir -p config/certificates

# Generate private key and certificate signing request, then sign it with CA
openssl req -new -newkey rsa:2048 -nodes -keyout "config/certificates/${SERIAL_NUMBER}.key" \
  -subj "$CERT_SUBJECT" | \
openssl x509 -req -days 3650 -CA "$CA_CERT_PATH" -CAkey "$CA_KEY_PATH" -set_serial "${SERIAL_NUMBER}" \
  -out "config/certificates/${SERIAL_NUMBER}.crt"

# Check if certificate generation was successful
if [ $? -ne 0 ]; then
  echo "Error: Failed to generate certificate."
  exit 1
fi

# Generate p12 file
openssl pkcs12 -export -out "$OUTPUT_FILE" \
  -inkey "config/certificates/${SERIAL_NUMBER}.key" \
  -in "config/certificates/${SERIAL_NUMBER}.crt" \
  -name "${COMMON_NAME}" \
  -passout "pass:${PASSWORD}"

# Check if p12 generation was successful
if [ $? -ne 0 ]; then
  echo "Error: Failed to generate p12 file."
  # Clean up partial files
  rm -f "config/certificates/${SERIAL_NUMBER}.key" "config/certificates/${SERIAL_NUMBER}.crt"
  exit 1
fi

# Clean up temporary certificate and key files
rm -f "config/certificates/${SERIAL_NUMBER}.key" "config/certificates/${SERIAL_NUMBER}.crt"

echo "Certificate generated successfully!"
echo "File: ${OUTPUT_FILE}"
echo "Password: ${PASSWORD}"
echo "Common Name: ${COMMON_NAME}"
echo "Serial Number: ${SERIAL_NUMBER}"

# Clean up temporary K8s files if they were created
if [ -n "$K8S_SECRET_NAME" ] && [ -n "$TEMP_DIR" ] && [ -d "$TEMP_DIR" ]; then
  rm -rf "$TEMP_DIR" 2>/dev/null || true
fi
