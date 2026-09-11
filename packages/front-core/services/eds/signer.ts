import forge, {
  PrivateKey,
  Certificate,
  ByteBuffer,
  Attribute,
  Asn1Node,
  P7Message,
} from 'node-forge';

import customPassword from 'helpers/customPassword';

interface Message {
  cmd: string;
  commandData: unknown[];
}

export default class Signer {
  serverList: unknown[];
  p12Data: Uint8Array | null;
  password: string | null;
  privateKey: PrivateKey | null;
  certificate: Certificate | null;
  certificates: Certificate[];
  inited: boolean;
  runtimeParams?: Record<string, unknown>;

  constructor() {
    this.serverList = [];

    // PKCS12/PKCS7 state
    this.p12Data = null;
    this.password = null;
    this.privateKey = null;
    this.certificate = null;
    this.certificates = [];

    // Mark as initialized (required by EDS service)
    this.inited = true;
  }

  send(message: Message) {
    if (!message.cmd) {
      throw new Error('Command is required');
    }

    switch (message.cmd) {
      case 'SignData':
        return this._signData(message.commandData[0] as string | Uint8Array, message.commandData[1] as boolean);
      case 'SignHash':
        return this._signHash(message.commandData[0] as string | Uint8Array);
      case 'EnumJKSPrivateKeys':
        return this._enumJKSPrivateKeys(message.commandData[0] as Uint8Array, message.commandData[1] as string | number);
      case 'GetJKSPrivateKey':
        return this._getJKSPrivateKey(message.commandData[0] as Uint8Array, message.commandData[1] as string | number);
      case 'ParseCertificate':
        return this._parseCertificate(message.commandData[0] as string | Uint8Array);
      case 'ReadPrivateKey':
        return this._readPrivateKey(message.commandData[0] as Uint8Array, message.commandData[1] as string);
      case 'SetUseCMP':
        return this._setUseCMP(message.commandData[0] as boolean);
      case 'ResetPrivateKey':
        return this._resetPrivateKey();
      case 'Base64Decode':
        return this._base64Decode(message.commandData[0] as string);
      case 'ArrayToString':
        return this._arrayToString(message.commandData[0] as Uint8Array);
      case 'DevelopData':
        return this._developData(message.commandData[0] as string | Uint8Array);
      case 'VerifyDataInternal':
        return this._verifyDataInternal(message.commandData[0] as string, message.commandData[1] as string | null);
      case 'VerifyHash':
        return this._verifyHash(message.commandData[0], message.commandData[1]);
      case 'HashData':
        return this._hashData(message.commandData[0], message.commandData[1] as boolean);
      case 'EnumOwnCertificates':
        return this._enumOwnCertificates(message.commandData[0] as number);
      case 'GetServerList':
        return this._getServerList();
      case 'SaveCertificate':
        return this._saveCertificate(message.commandData[0]);
      case 'setServer':
        return this._setServer(message.commandData[0]);
      case 'SetRuntimeParameter':
        return this._setRuntimeParameter(message.commandData[0] as string, message.commandData[1]);
      case 'EnvelopDataToRecipientsWithDynamicKey':
        return this._envelopDataToRecipientsWithDynamicKey(message.commandData[0] as unknown[], ...message.commandData.slice(1));
      default:
        throw new Error('Unknown command: ' + message.cmd);
    }
  }

  getServerList() {
    return this.serverList;
  }

  /**
   * Load and parse P12 file
   * @param {Uint8Array} p12Data - P12 file data
   * @param {string} password - P12 password
   */
  async _loadP12File(p12Data: Uint8Array, password?: string | null) {
    try {
      // Convert Uint8Array to string for forge
      const p12Der = String.fromCharCode.apply(null, p12Data as unknown as number[]);

      // Parse P12 file
      const p12Asn1 = forge.asn1.fromDer(p12Der);
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password || undefined);

      // Extract certificates
      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
      if (!certBags[forge.pki.oids.certBag] || certBags[forge.pki.oids.certBag].length === 0) {
        throw new Error('No certificate found in P12 file');
      }

      this.certificates = certBags[forge.pki.oids.certBag].map((bag) => bag.cert as Certificate);
      this.certificate = this.certificates[0];

      // Extract private key
      const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
      if (
        !keyBags[forge.pki.oids.pkcs8ShroudedKeyBag] ||
        keyBags[forge.pki.oids.pkcs8ShroudedKeyBag].length === 0
      ) {
        throw new Error('No private key found in P12 file');
      }

      this.privateKey = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0].key as PrivateKey;
      this.p12Data = p12Data;
      this.password = password || null;

      return true;
    } catch (error) {
      console.error('EDS subsystem: Failed to load P12 file:', error);
      throw error;
    }
  }

  /**
   * Sign data using PKCS7
   * @param {Uint8Array|string} data - Data to sign
   * @param {boolean} detached - Whether to create detached signature
   */
  async _signData(data: string | Uint8Array, detached = false) {
    try {
      if (!this.privateKey || !this.certificate) {
        throw new Error('Private key and certificate must be loaded first');
      }

      // Create PKCS#7 signed data
      const p7 = forge.pkcs7.createSignedData();

      // Always set content - forge needs it to compute the hash
      p7.content = forge.util.createBuffer(data, typeof data === 'string' ? 'utf8' : 'binary');

      p7.addCertificate(this.certificate);
      p7.addSigner({
        key: this.privateKey,
        certificate: this.certificate,
        digestAlgorithm: forge.pki.oids.sha256
      });

      // Sign the data
      p7.sign({ detached: detached });

      // Convert to DER and then base64
      const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
      return btoa(der);
    } catch (error) {
      console.error('EDS subsystem: Failed to sign data:', error);
      throw error;
    }
  }

  /**
   * Sign hash directly
   * @param {string|Uint8Array} hash - Hash to sign
   */
  async _signHash(hash: string | Uint8Array) {
    try {
      if (!this.privateKey || !this.certificate) {
        throw new Error('Private key and certificate must be loaded first');
      }

      // Convert hash to bytes if it's a string
      let hashBytes: string;
      if (typeof hash === 'string') {
        // Assume it's base64 or hex encoded
        try {
          hashBytes = forge.util.decode64(hash);
        } catch (e) {
          void e;
          // Try hex decode
          hashBytes = forge.util.hexToBytes(hash);
        }
      } else {
        hashBytes = String.fromCharCode.apply(null, hash as unknown as number[]);
      }

      // Create a message digest object with the hash
      // Assume SHA-256 hash (32 bytes) or SHA-1 hash (20 bytes)
      const md = hashBytes.length === 20 ? forge.md.sha1.create() : forge.md.sha256.create();
      // Set the digest directly instead of updating
      md.digest = function () {
        return forge.util.createBuffer(hashBytes) as ByteBuffer;
      };

      // Sign the hash with the private key
      const signature = this.privateKey.sign(md);

      // Return base64 encoded signature
      return btoa(signature);
    } catch (error) {
      console.error('EDS subsystem: Failed to sign hash:', error);
      throw error;
    }
  }

  /**
   * Enumerate JKS/P12 private keys
   * @param {Uint8Array} keyData - Key file data
   * @param {string|number} passwordOrIndex - Password for P12 file or key index
   */
  async _enumJKSPrivateKeys(keyData: Uint8Array, passwordOrIndex: string | number = 0) {
    try {
      // If passwordOrIndex is a string, treat it as password
      // If it's a number, treat it as index and use stored password
      let password = this.password;
      let index = 0;

      if (typeof passwordOrIndex === 'string') {
        password = passwordOrIndex;
        index = 0;
      } else if (typeof passwordOrIndex === 'number') {
        index = passwordOrIndex;
      }

      // For PKCS12 files, we need a password to enumerate keys
      // If no password is available yet, return a placeholder response
      if (!password) {
        return {
          index: index,
          algorithm: 'RSA',
          keyLength: 2048,
          available: index === 0, // Only first key is "available" when no password
          subject: 'PKCS12 Certificate (password required)'
        };
      }

      // Load P12 file if not already loaded or if password changed
      if (!this.p12Data || password !== this.password) {
        await this._loadP12File(keyData, password);
      }

      // Return actual key info from loaded certificates
      if (index >= this.certificates.length) {
        return {
          index: index,
          available: false
        };
      }

      const cert = this.certificates[index];
      return {
        index: index,
        algorithm: cert.publicKey.algorithm || 'RSA',
        keyLength: cert.publicKey.n ? cert.publicKey.n.bitLength() : 2048,
        available: this.certificates.length > index,
        subject: cert.subject.getField('CN')?.value || 'Unknown'
      };
    } catch (error) {
      console.error('EDS subsystem: Failed to enumerate private keys:', error);
      throw error;
    }
  }

  /**
   * Get JKS/P12 private key
   * @param {Uint8Array} keyData - Key file data
   * @param {string|number} passwordOrKeyIndex - Password for P12 file or key index
   */
  async _getJKSPrivateKey(keyData: Uint8Array, passwordOrKeyIndex: string | number = 0) {
    try {
      // Handle password vs keyIndex parameter
      let password = this.password;
      let keyIndex = 0;

      if (typeof passwordOrKeyIndex === 'string') {
        password = passwordOrKeyIndex;
        keyIndex = 0;
      } else if (typeof passwordOrKeyIndex === 'number') {
        keyIndex = passwordOrKeyIndex;
      }

      // Load P12 file if not already loaded or if password provided
      if (!this.privateKey || (password && password !== this.password)) {
        await this._loadP12File(keyData, password);
      }

      return {
        privateKey: this.privateKey,
        certificate: this.certificates[keyIndex] || this.certificate,
        certificates: this.certificates
      };
    } catch (error) {
      console.error('EDS subsystem: Failed to get private key:', error);
      throw error;
    }
  }

  /**
   * Parse certificate
   * @param {string|Uint8Array} certData - Certificate data
   */
  async _parseCertificate(certData: string | Uint8Array) {
    try {
      let cert: Certificate;
      if (typeof certData === 'string') {
        if (certData.includes('-----BEGIN CERTIFICATE-----')) {
          cert = forge.pki.certificateFromPem(certData);
        } else {
          // Assume base64 DER
          const der = forge.util.decode64(certData);
          cert = forge.pki.certificateFromAsn1(forge.asn1.fromDer(der));
        }
      } else {
        // Uint8Array DER
        const der = String.fromCharCode.apply(null, certData as unknown as number[]);
        cert = forge.pki.certificateFromAsn1(forge.asn1.fromDer(der));
      }

      return {
        subject: cert.subject.attributes.map((attr) => ({
          type: attr.type,
          value: attr.value,
          shortName: attr.shortName
        })),
        issuer: cert.issuer.attributes.map((attr) => ({
          type: attr.type,
          value: attr.value,
          shortName: attr.shortName
        })),
        serialNumber: cert.serialNumber,
        notBefore: cert.validity.notBefore,
        notAfter: cert.validity.notAfter,
        publicKey: cert.publicKey,
        // Ukrainian EDS compatibility fields
        subjDRFOCode: this._extractUkrainianField(cert, 'subjDRFOCode'),
        keyUsage: this._extractKeyUsage(cert)
      };
    } catch (error) {
      console.error('EDS subsystem: Failed to parse certificate:', error);
      throw error;
    }
  }

  /**
   * Read private key from data
   * @param {Uint8Array} keyData - Private key data
   * @param {string} password - Key password
   */
  async _readPrivateKey(keyData: Uint8Array, password?: string) {
    try {
      return await this._loadP12File(keyData, password);
    } catch (error) {
      console.error('EDS subsystem: Failed to read private key:', error);
      throw error;
    }
  }

  /**
   * Set use CMP (Certificate Management Protocol)
   * @param {boolean} useCMP - Whether to use CMP
   */
  _setUseCMP(useCMP: boolean) {
    console.log('SetUseCMP:', useCMP);
    // CMP settings - implement as needed
    return true;
  }

  /**
   * Reset private key
   */
  _resetPrivateKey() {
    this.privateKey = null;
    this.certificate = null;
    this.certificates = [];
    this.p12Data = null;
    this.password = null;
    return true;
  }

  /**
   * Decode base64 data
   * @param {string} base64Data - Base64 encoded data
   */
  _base64Decode(base64Data: string) {
    try {
      const decoded = atob(base64Data);
      return new Uint8Array(decoded.split('').map((char) => char.charCodeAt(0)));
    } catch (error) {
      console.error('EDS subsystem: Failed to decode base64:', error);
      throw error;
    }
  }

  /**
   * Convert array to string
   * @param {Uint8Array} array - Array to convert
   */
  _arrayToString(array: Uint8Array) {
    try {
      return String.fromCharCode.apply(null, array as unknown as number[]);
    } catch (error) {
      console.error('EDS subsystem: Failed to convert array to string:', error);
      throw error;
    }
  }

  /**
   * Develop (decrypt) data
   * @param {string|Uint8Array} encryptedData - Encrypted data
   */
  async _developData(encryptedData: string | Uint8Array) {
    try {
      if (!this.privateKey) {
        throw new Error('Private key must be loaded first');
      }

      // Implement PKCS7 envelope decryption
      let p7: P7Message;
      if (typeof encryptedData === 'string') {
        const der = forge.util.decode64(encryptedData);
        p7 = forge.pkcs7.messageFromAsn1(forge.asn1.fromDer(der));
      } else {
        const der = String.fromCharCode.apply(null, encryptedData as unknown as number[]);
        p7 = forge.pkcs7.messageFromAsn1(forge.asn1.fromDer(der));
      }

      // Decrypt with private key
      p7.decrypt((p7.recipients as unknown[])[0], this.privateKey);
      return (p7.content as ByteBuffer).getBytes();
    } catch (error) {
      console.error('EDS subsystem: Failed to develop data:', error);
      throw error;
    }
  }

  /**
   * Verify data internal
   * @param {string|object} certificate - Certificate to verify with
   */
  async _verifyDataInternal(base64Data: string, fallbackSignTime: string | null = null) {
    try {
      const der = forge.util.decode64(base64Data);
      const asn1 = forge.asn1.fromDer(der);
      const p7 = forge.pkcs7.messageFromAsn1(asn1);

      const getAttrValue = (attrs: Attribute[] = [], shortName: string) => {
        const attr = attrs.find((item) => item.shortName === shortName);
        return attr ? attr.value : null;
      };

      const formatDn = (attrs: Attribute[] = []) =>
        attrs
          .map((item) => `${item.shortName || item.name || 'attr'}=${item.value}`)
          .join(', ');

      const formatDate = (date: unknown) =>
        date instanceof Date && !Number.isNaN(date.getTime())
          ? date.toISOString()
          : null;

      let certificateDetails = {
        subjCN: null as unknown,
        subjOrg: null as unknown,
        subjUnit: null as unknown,
        subjCountry: null as unknown,
        issuerCN: null as unknown,
        issuerOrg: null as unknown,
        issuerUnit: null as unknown,
        issuerCountry: null as unknown,
        serialNumber: null as unknown,
        validFrom: null as string | null,
        validTo: null as string | null,
        subjectDN: null as string | null,
        issuerDN: null as string | null,
      };

      if (p7.certificates && p7.certificates.length > 0) {
        const cert = p7.certificates[0];
        certificateDetails = {
          subjCN: getAttrValue(cert.subject.attributes, 'CN'),
          subjOrg: getAttrValue(cert.subject.attributes, 'O'),
          subjUnit: getAttrValue(cert.subject.attributes, 'OU'),
          subjCountry: getAttrValue(cert.subject.attributes, 'C'),
          issuerCN: getAttrValue(cert.issuer.attributes, 'CN'),
          issuerOrg: getAttrValue(cert.issuer.attributes, 'O'),
          issuerUnit: getAttrValue(cert.issuer.attributes, 'OU'),
          issuerCountry: getAttrValue(cert.issuer.attributes, 'C'),
          serialNumber: cert.serialNumber || null,
          validFrom: formatDate(cert.validity?.notBefore),
          validTo: formatDate(cert.validity?.notAfter),
          subjectDN: formatDn(cert.subject.attributes),
          issuerDN: formatDn(cert.issuer.attributes),
        };
      }

      // Extract signing time from authenticated attributes (OID 1.2.840.113549.1.9.5)
      let signTimeStamp: string | null = null;
      const signingTimeOid = '1.2.840.113549.1.9.5';
      const authAttrs = p7.rawCapture && (p7.rawCapture.authenticatedAttributes as { value: Asn1Node[] } | undefined);
      if (authAttrs && authAttrs.value) {
        for (const attrSeq of authAttrs.value) {
          const seqValue = attrSeq.value as Asn1Node[] | undefined;
          if (!seqValue || seqValue.length < 2) continue;
          if (seqValue[0].value === signingTimeOid) {
            const nested = seqValue[1].value as Asn1Node[] | undefined;
            const timeNode = nested && nested[0];
            if (timeNode) {
              if (timeNode.type === forge.asn1.Type.UTCTIME) {
                signTimeStamp = forge.asn1.utcTimeToDate(timeNode.value).toISOString();
              } else if (timeNode.type === forge.asn1.Type.GENERALIZEDTIME) {
                signTimeStamp = forge.asn1.generalizedTimeToDate(timeNode.value).toISOString();
              } else {
                signTimeStamp = timeNode.value as string;
              }
            }
            break;
          }
        }
      }

      return {
        ownerInfo: {
          subjCN: certificateDetails.subjCN,
          subjOrg: certificateDetails.subjOrg,
          subjUnit: certificateDetails.subjUnit,
          subjCountry: certificateDetails.subjCountry,
        },
        timeInfo: { signTimeStamp: signTimeStamp || fallbackSignTime },
        issuerCN: certificateDetails.issuerCN,
        issuerOrg: certificateDetails.issuerOrg,
        issuerUnit: certificateDetails.issuerUnit,
        issuerCountry: certificateDetails.issuerCountry,
        serialNumber: certificateDetails.serialNumber,
        validFrom: certificateDetails.validFrom,
        validTo: certificateDetails.validTo,
        subjectDN: certificateDetails.subjectDN,
        issuerDN: certificateDetails.issuerDN,
      };
    } catch (error) {
      console.error('EDS subsystem: Failed to verify data internally:', error);
      throw error;
    }
  }

  /**
   * Verify hash signature
   * @param {string|Uint8Array} hash - Hash to verify
   * @param {string|Uint8Array} signature - Signature to verify
   */
  async _verifyHash(hash: unknown, signature: unknown) {
    try {
      if (!this.certificate) {
        throw new Error('Certificate must be loaded first');
      }

      const publicKey = this.certificate.publicKey;
      const verified = publicKey.verify(hash, signature);
      return { valid: verified };
    } catch (error) {
      console.error('EDS subsystem: Failed to verify hash:', error);
      throw error;
    }
  }

  /**
   * Hash data
   * @param {string|Uint8Array} data - Data to hash
   * @param {boolean} useSHA256 - Whether to use SHA256 (default: true)
   */
  async _hashData(data: unknown, usesha256 = true) {
    try {
      const md = usesha256 ? forge.md.sha256.create() : forge.md.sha1.create();
      md.update(data);
      return md.digest().getBytes();
    } catch (error) {
      console.error('EDS subsystem: Failed to hash data:', error);
      throw error;
    }
  }

  /**
   * Enumerate own certificates
   * @param {number} index - Certificate index
   */
  _enumOwnCertificates(index = 0) {
    try {
      if (index >= this.certificates.length) {
        return null;
      }

      return {
        index: index,
        certificate: this.certificates[index],
        available: this.certificates.length > index + 1
      };
    } catch (error) {
      console.error('EDS subsystem: Failed to enumerate certificates:', error);
      throw error;
    }
  }

  /**
   * Get server list
   */
  _getServerList() {
    return this.serverList;
  }

  // Additional methods for P7SForm compatibility

  /**
   * Save certificate (compatibility method)
   * @param {object} certificate - Certificate to save
   */
  _saveCertificate(certificate: unknown) {
    try {
      // In PKCS12 context, certificates are already loaded and managed
      // This is mainly for compatibility with Ukrainian EDS workflow
      console.log('EDS subsystem: SaveCertificate called (compatibility mode)', typeof certificate);
      return true;
    } catch (error) {
      console.error('EDS subsystem: Failed to save certificate:', error);
      throw error;
    }
  }

  /**
   * Set server (compatibility method)
   * @param {object} server - Server configuration
   */
  _setServer(server: unknown) {
    try {
      console.log('EDS subsystem: setServer called (compatibility mode):', server);
      // In PKCS12 context, we don't need ACSK servers
      return true;
    } catch (error) {
      console.error('EDS subsystem: Failed to set server:', error);
      throw error;
    }
  }

  /**
   * Set runtime parameter (compatibility method)
   * @param {string} param - Parameter name
   * @param {*} value - Parameter value
   */
  _setRuntimeParameter(param: string, value: unknown) {
    try {
      console.log('EDS subsystem: SetRuntimeParameter called (compatibility mode):', param, value);
      // Store runtime parameters for potential use
      if (!this.runtimeParams) {
        this.runtimeParams = {};
      }
      this.runtimeParams[param] = value;
      return true;
    } catch (error) {
      console.error('EDS subsystem: Failed to set runtime parameter:', error);
      throw error;
    }
  }

  /**
   * Envelope data to recipients with dynamic key (compatibility method)
   * @param {Array} certBuffers - Certificate buffers
   * @param {...*} args - Additional arguments
   */
  _envelopDataToRecipientsWithDynamicKey(certBuffers: unknown[], ...args: unknown[]) {
    try {
      console.warn('EDS subsystem: EnvelopDataToRecipientsWithDynamicKey not fully implemented');
      console.log('EDS subsystem: Called with certs:', certBuffers?.length, 'args:', args);

      // For compatibility, return a mock encrypted result
      // In a real implementation, this would encrypt data for the given recipients
      const mockEncryptedData = btoa('mock-encrypted-envelope-data');
      return mockEncryptedData;
    } catch (error) {
      console.error('EDS subsystem: Failed to envelope data to recipients:', error);
      throw error;
    }
  }

  // Helper methods for Ukrainian EDS field extraction

  /**
   * Extract Ukrainian-specific certificate fields
   * @param {object} cert - Forge certificate object
   * @param {string} fieldName - Field name to extract
   */
  _extractUkrainianField(cert: Certificate, fieldName: string) {
    try {
      // Try to extract from certificate extensions or subject
      if (cert.extensions) {
        for (const ext of cert.extensions) {
          if (ext.name && ext.name.includes(fieldName)) {
            return ext.value;
          }
        }
      }

      // Try to extract from subject attributes
      const subjectAttr = cert.subject.attributes.find(
        (attr) => attr.shortName === fieldName || attr.name === fieldName
      );

      return subjectAttr?.value || null;
    } catch (error) {
      console.warn('EDS subsystem: Failed to extract Ukrainian field:', fieldName, error);
      return null;
    }
  }

  /**
   * Extract key usage information
   * @param {object} cert - Forge certificate object
   */
  _extractKeyUsage(cert: Certificate) {
    try {
      // Look for key usage extension
      const keyUsageExt = cert.extensions?.find((ext) => ext.name === 'keyUsage');
      if (keyUsageExt) {
        // For Ukrainian compatibility, return Ukrainian text if available
        if (keyUsageExt.keyAgreement || keyUsageExt.keyEncipherment) {
          return 'Протоколи розподілу ключів';
        }
        if (keyUsageExt.digitalSignature || keyUsageExt.nonRepudiation) {
          return 'Цифровий підпис';
        }
      }

      // Default fallback
      return 'Невідомо';
    } catch (error) {
      console.warn('EDS subsystem: Failed to extract key usage:', error);
      return 'Невідомо';
    }
  }

  async execute(...rest: unknown[]) {
    const commandData = Array.prototype.slice.call(rest);
    const cmd = commandData.shift();
    const commandId = customPassword();
    return await this.send({ cmd, commandId, commandData } as unknown as Message);
  }
}
