// X.509 and PKCS OIDs used in the x509 module
// https://oidref.com

// Subject/Issuer field OIDs
export const OID_COMMON_NAME = '2.5.4.3'; // Common Name (CN)
export const OID_SURNAME = '2.5.4.4'; // Surname (SN)
export const OID_GIVEN_NAME = '2.5.4.42'; // Given Name (GN)
export const OID_INITIALS = '2.5.4.43'; // Initials (initials)
export const OID_ORGANIZATION_NAME = '2.5.4.10'; // Organization Name (O)
export const OID_ORGANIZATION_IDENTIFIER = '2.5.4.97'; // Organization Identifier (eIDAS)
export const OID_COUNTRY_NAME = '2.5.4.6'; // Country Name (C)
export const OID_LOCALITY_NAME = '2.5.4.7'; // Locality Name (L)
export const OID_PERSON_IDENTIFIER = '1.3.6.1.4.1.311.60.2.1.3'; // eIDAS PersonIdentifier
export const OID_SERIAL_NUMBER = '2.5.4.5'; // Serial Number (SN)

// PKCS#7/CMS OIDs
export const OID_PKCS7_DATA = '1.2.840.113549.1.7.1'; // PKCS#7 Data
export const OID_PKCS7_SIGNED_DATA = '1.2.840.113549.1.7.2'; // PKCS#7 SignedData
export const OID_PKCS7_ENVELOPED_DATA = '1.2.840.113549.1.7.3'; // PKCS#7 EnvelopedData
export const OID_PKCS7_DIGESTED_DATA = '1.2.840.113549.1.7.5'; // PKCS#7 DigestedData
export const OID_PKCS7_ENCRYPTED_DATA = '1.2.840.113549.1.7.6'; // PKCS#7 EncryptedData

// PKCS#12 Bag OIDs
export const OID_CERT_BAG = '1.2.840.113549.1.12.10.1.3'; // certBag
export const OID_PKCS8_SHROUDED_KEY_BAG = '1.2.840.113549.1.12.10.1.2'; // pkcs8ShroudedKeyBag

// Certificate bag value OID
export const OID_X509_CERTIFICATE = '1.2.840.113549.1.9.22.1'; // x509Certificate

// Digest algorithm OIDs
export const OID_SHA1 = '1.3.14.3.2.26'; // SHA-1
export const OID_SHA256 = '2.16.840.1.101.3.4.2.1'; // SHA-256
export const OID_SHA512 = '2.16.840.1.101.3.4.2.3'; // SHA-512

// Signature algorithm OIDs
export const OID_RSA_ENCRYPTION = '1.2.840.113549.1.1.1'; // rsaEncryption

// CMS attribute OIDs
export const OID_SIGNING_TIME = '1.2.840.113549.1.9.5'; // signingTime

// Extension OIDs
export const OID_BASIC_CONSTRAINTS = '2.5.29.19'; // basicConstraints
