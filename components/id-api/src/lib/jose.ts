import jose from 'node-jose';

/**
 * JSON Object Signing and Encryption (JOSE)
 */
export class Jose {
  private readonly keystore: jose.JWK.KeyStore;
  private readonly externalPublicKeyRaw: Buffer<ArrayBufferLike> | string;
  private readonly internalPrivateKeyRaw: Buffer<ArrayBufferLike> | string | null;
  private externalPublicKey?: jose.JWK.Key;
  public internalPrivateKey?: jose.JWK.Key;
  private internalKid: string | null = null;
  private externalKid: string | null = null;
  private readonly kid: string | null = null;

  /**
   * @param {Buffer | string} externalPublicKey Foreign public key to verify JWT signature
   * @param {Buffer | string} internalPrivateKey Our private key to decrypt JWE payload
   */
  constructor(externalPublicKey: Buffer<ArrayBufferLike> | string, internalPrivateKey: Buffer<ArrayBufferLike> | string | null = null) {
    this.keystore = jose.JWK.createKeyStore();
    this.externalPublicKeyRaw = externalPublicKey;
    this.internalPrivateKeyRaw = internalPrivateKey;
  }

  /**
   * Initialize the keystore with provided keys or generate a new pair
   */
  async initialize() {
    if (this.internalPrivateKeyRaw) {
      this.internalPrivateKey = await jose.JWK.asKey(this.internalPrivateKeyRaw, 'pem');
      await this.keystore.add(this.internalPrivateKey);
      this.internalKid = this.internalPrivateKey.kid;
    }

    if (this.externalPublicKeyRaw) {
      this.externalPublicKey = await jose.JWK.asKey(this.externalPublicKeyRaw, 'pem');
      await this.keystore.add(this.externalPublicKey);
      this.externalKid = this.externalPublicKey.kid;
    }
  }

  /**
   * Create a JWT using the private key
   * @param {object} payload Payload to sign
   * @returns {string} Signed JWT
   */
  async createJWT(payload: Record<string, any>): Promise<string> {
    if (!this.internalPrivateKey) throw new Error('Key pair not initialized. Call initialize() first.');

    const input = Buffer.from(JSON.stringify(payload));

    const jwt = await jose.JWS.createSign({ alg: 'RSA512', format: 'compact' }, this.keystore.get(this.kid!)).update(input).final();

    return jwt.toString();
  }

  /**
   * Verify a JWT using the public key
   * @param {string} token JWT to verify
   * @returns {object} Decoded payload
   */
  async verifyJWT(token: string): Promise<Record<string, any>> {
    if (!this.externalPublicKey) throw new Error('Key pair not initialized. Call initialize() first.');

    const key = this.keystore.get(this.externalKid!);

    const result = await jose.JWS.createVerify(key).verify(token);

    const payload = JSON.parse(result.payload.toString());

    // Check if token is expired against an optional 'exp' claim set in unix time
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }

    return payload;
  }

  /**
   * Encrypt data into a JWE using the public key
   * @param {object} data Data to encrypt
   * @returns {string} Encrypted JWE
   */
  async encryptJWE(data: Record<string, any>): Promise<string> {
    if (!this.internalKid) throw new Error('Key pair not initialized. Call initialize() first.');

    const jwe = await jose.JWE.createEncrypt({ format: 'compact' }, this.keystore.get(this.internalKid)).update(JSON.stringify(data)).final();

    return jwe;
  }

  /**
   * Decrypt a JWE using the private key
   * @param {string} jwe Encrypted JWE string
   * @returns {object} Decrypted data
   */
  async decryptJWE(jwe: string): Promise<Record<string, any>> {
    if (!this.internalPrivateKey) throw new Error('Key pair not initialized. Call initialize() first.');

    const key = this.keystore.get(this.internalKid!);

    const result = await jose.JWE.createDecrypt(key).decrypt(jwe);

    return JSON.parse(result.payload.toString());
  }
}
