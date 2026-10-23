// `node-forge` ships no types and there is no @types package installed.
// Scoped to what `services/eds/signer.ts` actually uses.
declare module 'node-forge' {
  export interface Asn1Node {
    type?: number;
    value?: unknown;
    [key: string]: unknown;
  }

  export interface ByteBuffer {
    getBytes(): string;
    length(): number;
    [key: string]: unknown;
  }

  export interface Attribute {
    type?: string;
    shortName?: string;
    name?: string;
    value?: unknown;
  }

  export interface CertificateSubject {
    attributes: Attribute[];
    getField(shortName: string): Attribute | null;
  }

  export interface PublicKey {
    algorithm?: string;
    n?: { bitLength(): number };
    verify(hash: unknown, signature: unknown): boolean;
    [key: string]: unknown;
  }

  export interface PrivateKey {
    sign(md: unknown): string;
    [key: string]: unknown;
  }

  export interface Extension {
    name?: string;
    value?: unknown;
    keyAgreement?: boolean;
    keyEncipherment?: boolean;
    digitalSignature?: boolean;
    nonRepudiation?: boolean;
    [key: string]: unknown;
  }

  export interface Certificate {
    subject: CertificateSubject;
    issuer: CertificateSubject;
    publicKey: PublicKey;
    serialNumber: string;
    validity: { notBefore: Date; notAfter: Date };
    extensions?: Extension[];
    [key: string]: unknown;
  }

  export interface Bag {
    cert?: Certificate;
    key?: PrivateKey;
    [key: string]: unknown;
  }

  export interface Pkcs12 {
    getBags(options: { bagType: string }): Record<string, Bag[]>;
  }

  export interface P7SignedData {
    content: unknown;
    addCertificate(cert: Certificate): void;
    addSigner(options: {
      key: PrivateKey;
      certificate: Certificate;
      digestAlgorithm: string;
    }): void;
    sign(options: { detached: boolean }): void;
    toAsn1(): Asn1Node;
    [key: string]: unknown;
  }

  export interface P7Message {
    certificates?: Certificate[];
    recipients?: unknown[];
    content?: ByteBuffer;
    rawCapture?: Record<string, unknown>;
    decrypt(recipient: unknown, key: PrivateKey): void;
    [key: string]: unknown;
  }

  export interface MessageDigest {
    update(data: unknown): void;
    digest(): ByteBuffer;
    [key: string]: unknown;
  }

  interface Forge {
    asn1: {
      fromDer(der: string): Asn1Node;
      toDer(obj: Asn1Node): ByteBuffer;
      utcTimeToDate(value: unknown): Date;
      generalizedTimeToDate(value: unknown): Date;
      Type: { UTCTIME: number; GENERALIZEDTIME: number; [key: string]: number };
    };
    pki: {
      oids: Record<string, string>;
      certificateFromPem(pem: string): Certificate;
      certificateFromAsn1(obj: Asn1Node): Certificate;
      [key: string]: unknown;
    };
    pkcs12: {
      pkcs12FromAsn1(obj: Asn1Node, password?: string): Pkcs12;
    };
    pkcs7: {
      createSignedData(): P7SignedData;
      messageFromAsn1(obj: Asn1Node): P7Message;
    };
    util: {
      createBuffer(data: unknown, encoding?: string): unknown;
      decode64(data: string): string;
      hexToBytes(data: string): string;
      [key: string]: unknown;
    };
    md: {
      sha1: { create(): MessageDigest };
      sha256: { create(): MessageDigest };
    };
  }

  const forge: Forge;
  export default forge;
}
