const StandardPaymentReceiptDocumentRequesterProvider = require('./providers/standard_payment_receipt');

/**
 * Document requester.
 */
class DocumentRequester {
  /**
   * Document requester constructor.
   * @param {{ minjustFop }} config Config.
   */
  constructor(config = {}) {
    // Singleton.
    if (!DocumentRequester.singleton) {
      // Define providers.
      this.providers = {
        standardPaymentReceipt: new StandardPaymentReceiptDocumentRequesterProvider(config['standardPaymentReceipt']),
      };

      // Define singleton.
      DocumentRequester.singleton = this;
    }

    // Return singleton.
    return DocumentRequester.singleton;
  }

  /**
   * Document.
   * @param {{ provider, options }} data Data to download document.
   * @returns {{ documentId }} Download result.
   */
  async download({ provider: providerName, options }) {
    // Define provider.
    const provider = this.providers[providerName];
    if (!provider) {
      throw new TypeError('Incorrect document requester provider.');
    }

    // Download.
    const downloadResult = await provider.download(options);
    return downloadResult;
  }

  /**
   * Get.
   * @param {{ provider, options }} data Data to get.
   * @returns {Promise<object[]>} Get records.
   */
  async get({ provider: providerName, options }) {
    // Define provider.
    const provider = this.providers[providerName];
    if (!provider) {
      throw new TypeError('Incorrect document requester provider.');
    }

    // Download.
    return provider.get(options);
  }
}

module.exports = DocumentRequester;
