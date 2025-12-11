
const providers = require('./providers');

// Constants.
const DEFAULT_PROVIDER_NAME = 'pkcs7';

/**
 * EDS.
 */
class Eds {
  /**
   * EDS constructor.
   * @param {object} edsConfig EDS config.
   */
  constructor(edsConfig) {
    // Define singleton.
    if (!Eds.singleton) {
      this.config = edsConfig;
      this.providerName = edsConfig.providerName || DEFAULT_PROVIDER_NAME;
      const Provider = providers.find(provider => provider.name === this.providerName);
      this.provider = new Provider(this.config[this.providerName]);
      Eds.singleton = this;
    }
    return Eds.singleton;
  }

  /**
   * Check.
   * @param {string} data Data.
   * @param {string} signature Signature.
   * @returns {boolean} Is correct signature indicator.
   */
  async check(data, signature) {
    return await this.provider.check(data, signature);
  }

  /**
   * Get signature info.
   * @param {string} signature Signature.
   * @param {string} [hash] Hash.
   * @param {boolean} [signExternal] Sign external.
   * @param {string} [content] Content.
   * @returns {Promise<{signer, issuer, serial, content, pem}>} Signature info promise.
   */
  async getSignatureInfo(signature, hash, signExternal, content) {
    return await this.provider.getSignatureInfo(signature, hash, signExternal, content);
  }

  /**
   * @param {string|buffer} p7sSign
   * @return {Promise<Array<string>>}
   */
  async getSignersRNOKPP(p7sSign) {
    return await this.provider.getSignersRNOKPP(p7sSign);
  }

  /**
   * Verify sign.
   * @param {string} signature Signature.
   * @returns {Promise<boolean>} Signature info promise.
   */
  async verifySign(signature) {
    return await this.provider.verifySign(signature);
  }

  /**
   * Send ping request.
   * @returns {Promise<{}>}
   */
  async sendPingRequest() {
    return await this.provider.sendPingRequest();
  }

  /**
   * Update sign. Replace hash by original content.
   * @param {string} signedHash Signed hash.
   * @param {string} content Content.
   * @returns {string}
   */
  hashToInternalSignature(signedHash, content) {
    return this.provider.hashToInternalSignature(signedHash, content);
  }

  /**
   * @param {Buffer} data
   * @param {boolean} [isReturnAsBase64 = true]
   * @return {string|Buffer}
   */
  hashData(data, isReturnAsBase64) {
    return this.provider.hashData(data, isReturnAsBase64);
  }

  /**
   * @param {string} hash
   * @param {string} sign
   * @return {EndUserSignInfo}
   */
  verifyHash(hash, sign) {
    return this.provider.verifyHash(hash, sign);
  }
}

module.exports = Eds;
