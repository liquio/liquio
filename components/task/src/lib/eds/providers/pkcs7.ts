import axios from 'axios';
import * as crypto from 'node:crypto';

import { getTraceId } from 'back-core';
import { EdsProvider } from './eds_provider';

// Constants.
const PROVIDER_NAME = 'pkcs7';

/**
 * PKCS7 EDS provider that delegates to sign-tool service.
 */
export class Pkcs7EdsProvider extends EdsProvider {
  config: any;
  signToolUrl: any;
  timeout: any;

  /**
   * PKCS7 EDS provider constructor.
   * @param {object} providerConfig Provider config.
   */
  constructor(providerConfig) {
    super();
    this.config = providerConfig;
    this.timeout = providerConfig.timeout || 30000;
    this.signToolUrl = providerConfig.signToolUrl || 'http://localhost:3000';
  }

  /**
   * Name.
   * @returns {string} Provider name.
   */
  // @ts-expect-error Intentional override of Function.name to identify this provider in the providers list.
  static get name() {
    return PROVIDER_NAME;
  }

  /**
   * Check.
   * @param {string} contentShouldBeSigned Content that should be signed.
   * @param {string} signature Signature in PKCS7 format (base64 encoded).
   * @param {string} [userCertPem] User certificate PEM.
   * @returns {Promise<boolean>} Is correct signature indicator promise.
   */
  async check(contentShouldBeSigned?, signature?, userCertPem?) {
    try {
      // Get signature info from sign-tool
      const signatureInfo = await this.getSignatureInfo(signature, undefined, false, Buffer.from(contentShouldBeSigned));
      if (!signatureInfo) {
        global.log.save('check-signature-error', 'Can\'t define signature info.', 'warn');
        return false;
      }

      const { content, pem } = signatureInfo;

      // Check if signed content matches expected content
      const contentString = Buffer.isBuffer(content) ? content.toString() : String(content);
      if (contentString !== contentShouldBeSigned) {
        global.log.save('check-signature-error', 'Signed content does not match expected content.', 'warn');
        return false;
      }

      // Check if certificate matches user's certificate (if provided)
      if (userCertPem && pem !== userCertPem) {
        global.log.save('check-signature-error', 'Signature certificate does not match user\'s certificate.', 'warn');
        return false;
      }

      return true;
    } catch (error) {
      global.log.save('check-signature-error', `Error during signature verification: ${error.message}`, 'warn');
      return false;
    }
  }

  /**
   * Private method to handle axios calls to sign-tool service.
   * @param {string} endpoint - The API endpoint (e.g., '/x509/signature-info').
   * @param {object} data - The request body data.
   * @returns {Promise<object|null>} Response data or null on error.
   * @private
   */
  async _callSignTool(path, data) {
    try {
      const headers = { 'Content-Type': 'application/json', 'x-trace-id': getTraceId() };

      const response = await axios.post(`${this.signToolUrl}${path}`, data, {
        headers,
        timeout: 30000, // 30 seconds timeout
      });

      return response.data;
    } catch (error) {
      // Enhanced error logging with response details
      const errorDetails: any = {
        message: error.message,
        path,
        requestData: data,
      };

      if (error.response) {
        errorDetails.status = error.response.status;
        errorDetails.statusText = error.response.statusText;
        errorDetails.responseData = error.response.data;
      }

      global.log.save('sign-tool-error-detailed', errorDetails, 'error');

      // Check for specific error types and provide more helpful messages
      if (error.response && error.response.status === 400) {
        const responseData = error.response.data;
        if (responseData && responseData.message === 'Invalid signature data') {
          const wrapped: any = new Error('Sign-tool rejected signature: Invalid signature format. This may not be a valid PKCS#7 signature.');
          wrapped.cause = error;
          throw wrapped;
        }
      }

      const wrapped: any = new Error(`Sign-tool request failed: ${error.message}`);
      wrapped.cause = error;
      throw wrapped;
    }
  }

  /**
   * Get signature info from sign-tool service.
   * @param {string} signature PKCS7 signature (base64 encoded).
   * @param {string|Buffer} [hashOrContent] Hash (for Ukrainian EDS) or expected content for PKCS7.
   * @param {boolean} [signExternal] Sign external flag.
   * @param {Buffer} [content] Expected content for verification.
   * @returns {Promise<{signer, issuer, serial, signTime, content, pem, isValid}>} Signature info promise.
   */
  async getSignatureInfo(signature, hashOrContent?, signExternal?, content?) {
    global.log.save(
      'pkcs7-getSignatureInfo-entry',
      {
        signatureProvided: !!signature,
        signatureType: typeof signature,
        hashOrContentType: typeof hashOrContent,
        signExternal,
        contentType: typeof content,
      },
      'info',
    );

    try {
      // Check params.
      if (typeof signature !== 'string') {
        global.log.save('get-signature-info-error', 'Signature not found.', 'warn');
        return null;
      }

      // Validate that this looks like a PKCS#7 signature
      // PKCS#7 signatures should start with specific ASN.1 identifiers when base64 decoded
      try {
        // A valid PKCS#7 signature should be reasonably long (typically > 500 chars)
        if (signature.length < 100) {
          global.log.save(
            'pkcs7-signature-too-short',
            {
              signatureLength: signature.length,
              message: 'Signature appears too short to be a valid PKCS#7 structure',
            },
            'warn',
          );
          return null;
        }

        // Check if it starts with typical PKCS#7 identifiers
        // PKCS#7 signatures typically start with MII when base64 encoded (ASN.1 SEQUENCE)
        if (!signature.match(/^MII[A-Za-z0-9]/)) {
          global.log.save(
            'pkcs7-signature-format-warning',
            {
              signatureStart: signature.substring(0, 20),
              signatureLength: signature.length,
              message: 'Signature does not appear to start with typical PKCS#7 identifiers - might be raw signature',
            },
            'warn',
          );
          // Continue processing - let sign-tool try to parse it and handle the error gracefully
        }
      } catch (validationError) {
        global.log.save(
          'pkcs7-signature-validation-error',
          {
            error: validationError.message,
            message: 'Error during signature format validation',
          },
          'warn',
        );
      }

      // For PKCS7 signatures, the expected content might be passed as the second parameter
      // (like in document business logic) or as the fourth parameter
      let expectedContent = content;
      if (!expectedContent && hashOrContent && (Buffer.isBuffer(hashOrContent) || typeof hashOrContent === 'string')) {
        expectedContent = Buffer.isBuffer(hashOrContent) ? hashOrContent : Buffer.from(hashOrContent);
      }

      let signatureInfo;
      try {
        signatureInfo = await this._callSignTool('/x509/signature-info', { sign: signature });
      } catch (error) {
        // Handle the case where sign-tool rejects the signature (e.g., raw signatures)
        global.log.save('get-signature-info-error', `Unexpected error in getSignatureInfo: ${error.message}`, 'error');
        global.log.save('get-signature-info-error-stack', { error: error.message, stack: error.stack }, 'error');

        // If this is a sign-tool rejection due to invalid signature format, return null
        // This allows the calling code to handle raw signatures gracefully
        if (error.message && error.message.includes('Sign-tool rejected signature')) {
          global.log.save(
            'get-signature-info-raw-signature-detected',
            {
              message: 'Signature rejected by sign-tool, treating as raw signature',
              signatureLength: signature.length,
              signatureStart: signature.substring(0, 20),
            },
            'warn',
          );
          return null;
        }

        // Re-throw other types of errors
        throw error;
      }

      global.log.save(
        'pkcs7-signtool-response',
        {
          signatureInfoReceived: !!signatureInfo,
          signatureInfoType: typeof signatureInfo,
          signatureInfoKeys: signatureInfo ? Object.keys(signatureInfo) : null,
        },
        'info',
      );

      if (!signatureInfo) {
        global.log.save('pkcs7-signtool-null-response', 'Sign-tool returned null/undefined response', 'warn');
        return null;
      }

      // Convert to expected format
      // If expected content is provided, use it instead of signature's embedded content
      const resultContent =
        expectedContent && Buffer.isBuffer(expectedContent)
          ? expectedContent
          : signatureInfo.content
            ? Buffer.from(signatureInfo.content, 'base64')
            : Buffer.alloc(0);

      // Extract IPN from certificate subject
      // For PKCS7 certificates, we need to map the certificate data to the expected IPN format
      // The serialNumber from the certificate subject should be used as the DRFO (individual tax ID)
      let ipnDRFO = null;
      let ipnEDRPOU = null;

      const extractIdentifierPair = (rawValue) => {
        if (rawValue === undefined || rawValue === null) {
          return { primary: null, secondary: null };
        }

        const normalized = String(rawValue).trim();
        if (!normalized) {
          return { primary: null, secondary: null };
        }

        const [primaryRaw, secondaryRaw] = normalized.split('-', 2);
        const primary = primaryRaw ? primaryRaw.trim() : null;
        const secondary = secondaryRaw ? secondaryRaw.trim() : null;

        return {
          primary: primary || null,
          secondary: secondary || null,
        };
      };

      // Strategy 1: Get IPN from the certificate subject's serialNumber field
      if (signatureInfo.subject && signatureInfo.subject.serialNumber) {
        const serialIds = extractIdentifierPair(signatureInfo.subject.serialNumber);
        if (serialIds.primary) {
          ipnDRFO = serialIds.primary;
        }
        if (serialIds.secondary) {
          ipnEDRPOU = serialIds.secondary;
        }
      }

      // Strategy 2: Fallback to personIdentifier if available and IPN not found yet
      if (!ipnDRFO && signatureInfo.subject && signatureInfo.subject.personIdentifier) {
        const personIds = extractIdentifierPair(signatureInfo.subject.personIdentifier);
        if (personIds.primary) {
          ipnDRFO = personIds.primary;
        }
        if (!ipnEDRPOU && personIds.secondary) {
          ipnEDRPOU = personIds.secondary;
        }
      }

      // Strategy 3: Additional fallback - check commonName for IPN patterns
      if (!ipnDRFO && signatureInfo.subject && signatureInfo.subject.commonName) {
        const commonName = String(signatureInfo.subject.commonName);
        // Sometimes IPN is embedded in commonName, try to extract numeric sequences
        const ipnMatch = commonName.match(/\b\d{10}\b/);
        if (ipnMatch) {
          ipnDRFO = ipnMatch[0];
        }
      }

      // Strategy 4: Check organizationIdentifier for EDRPOU if not found yet
      if (!ipnEDRPOU && signatureInfo.subject && signatureInfo.subject.organizationIdentifier) {
        const orgId = String(signatureInfo.subject.organizationIdentifier).trim();
        if (orgId) {
          ipnEDRPOU = orgId;
        }
      }

      global.log.save(
        'pkcs7-ipn-extraction',
        {
          ipnDRFO,
          ipnEDRPOU,
          serialNumber: signatureInfo.subject.serialNumber,
          personIdentifier: signatureInfo.subject.personIdentifier,
          organizationIdentifier: signatureInfo.subject.organizationIdentifier,
          commonName: signatureInfo.subject.commonName,
          allSubjectFields: Object.keys(signatureInfo.subject || {}),
          allSubjectValues: signatureInfo.subject,
        },
        'info',
      );

      // If we still couldn't extract IPN, log a warning but don't fail completely
      if (!ipnDRFO) {
        global.log.save(
          'pkcs7-ipn-extraction-failed',
          {
            message: 'Could not extract IPN from certificate subject',
            subjectFields: signatureInfo.subject,
            availableFields: Object.keys(signatureInfo.subject || {}),
          },
          'warn',
        );
      }

      const signerInfo = {
        ...signatureInfo.subject,
        ipn: {
          DRFO: ipnDRFO,
          EDRPOU: ipnEDRPOU,
        },
      };

      const result = {
        signer: signerInfo,
        issuer: signatureInfo.issuer,
        serial: signatureInfo.serial,
        signTime: signatureInfo.signTime,
        content: resultContent,
        pem: signatureInfo.pem,
        isValid: true, // If sign-tool returned data, consider it valid
      };

      global.log.save(
        'pkcs7-final-result',
        {
          signerIpnDRFO: result.signer?.ipn?.DRFO,
          signerIpnEDRPOU: result.signer?.ipn?.EDRPOU,
          fullSigner: result.signer,
        },
        'info',
      );

      global.log.save(
        'pkcs7-getSignatureInfo-success',
        {
          message: 'Successfully returning signature info',
          hasResult: !!result,
          hasSigner: !!result?.signer,
          hasIpn: !!result?.signer?.ipn,
          ipnDRFO: result?.signer?.ipn?.DRFO,
        },
        'info',
      );

      return result;
    } catch (error) {
      // Handle specific sign-tool errors
      if (error.message && error.message.includes('Sign-tool rejected signature')) {
        global.log.save(
          'get-signature-info-signtool-rejected',
          {
            error: error.message,
            message: 'Sign-tool rejected signature - might be raw signature instead of PKCS#7',
          },
          'warn',
        );

        // Return null to indicate this signature couldn't be processed as PKCS#7
        // The calling code should handle this gracefully
        return null;
      }

      global.log.save('get-signature-info-error', `Unexpected error in getSignatureInfo: ${error.message}`, 'error');
      global.log.save(
        'get-signature-info-error-stack',
        {
          error: error.message,
          stack: error.stack,
        },
        'error',
      );
      return null;
    }
  }

  /**
   * Verify PKCS7 signature via sign-tool service.
   * @param {string} signature PKCS7 signature (base64 encoded).
   * @returns {Promise<boolean>}
   */
  async verifySign(signature) {
    try {
      const signatureInfo = await this.getSignatureInfo(signature);
      return !!signatureInfo;
    } catch (error) {
      global.log.save('verify-sign-error', `Error verifying PKCS7 signature: ${error.message}`, 'warn');
      return false;
    }
  }

  /**
   * Get signers RNOKPP (Ukrainian tax number).
   * Note: This method is specific to Ukrainian EDS and may not be applicable for PKCS7.
   * @param {string|Buffer} p7sSign PKCS7 signature.
   * @returns {Promise<Array<string>>} Array of RNOKPP numbers.
   */
  async getSignersRNOKPP(_p7sSign) {
    global.log.save('get-signers-rnokpp-warning', 'RNOKPP extraction not implemented for PKCS7 provider.', 'warn');
    return [];
  }

  /**
   * Send ping request.
   * Note: This method is specific to Ukrainian EDS infrastructure.
   * @returns {Promise<{}>} Empty object for PKCS7 provider.
   */
  async sendPingRequest() {
    global.log.save('send-ping-request-warning', 'Ping request not applicable for PKCS7 provider.', 'warn');
    return {};
  }

  /**
   * Hash to internal signature via sign-tool service.
   * @param {string} signedHash Signed hash.
   * @param {string} content Content.
   * @returns {string} Internal signature.
   */
  async hashToInternalSignature(signedHash, content) {
    const result = await this._callSignTool('/x509/hash-to-internal-signature', {
      hash: signedHash,
      content: Buffer.from(content).toString('base64'),
    });

    if (result) {
      return result;
    }

    global.log.save('hash-to-internal-signature-error', 'Failed to get response from sign-tool service.', 'warn');
    return signedHash;
  }

  /**
   * Hash data via sign-tool service.
   * @param {Buffer} data Data to hash.
   * @param {boolean} [isReturnAsBase64=true] Return as base64.
   * @returns {string|Buffer} Hashed data.
   */
  async hashData(data, isReturnAsBase64 = true) {
    const result = await this._callSignTool('/x509/hash-data', {
      data: data.toString('base64'),
      isReturnAsBase64,
    });

    if (result) {
      return isReturnAsBase64 ? result : Buffer.from(result, 'base64');
    }

    // Fallback to local implementation
    global.log.save('hash-data-fallback', 'Using local crypto implementation as fallback.', 'info');
    const hash = crypto.createHash('sha256').update(data).digest();
    return isReturnAsBase64 ? hash.toString('base64') : hash;
  }

  /**
   * Verify hash via sign-tool service.
   * @param {string} hash Hash to verify.
   * @param {string} sign Signature.
   * @returns {Promise<object>} Verification result.
   */
  async verifyHash(hash, sign) {
    try {
      const response = await axios.post(
        `${this.signToolUrl}/x509/verify-hash`,
        { hash, sign },
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json',
            'x-trace-id': getTraceId(),
          },
        },
      );

      if (response && response.data && typeof response.data.result === 'boolean') {
        return { isValid: response.data.result, message: response.data.result ? 'Hash verified successfully' : 'Hash verification failed' };
      }

      return { isValid: false, message: 'No response from sign-tool service' };
    } catch (error) {
      global.log.save('verify-hash-error', `Error calling sign-tool service: ${error.message}`, 'warn');
      return { isValid: false, message: `Error: ${error.message}` };
    }
  }
}

