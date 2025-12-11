const jsonxml = require('jsontoxml');
const xml2js = require('xml2js');

/**
 * ASIC manifest.
 * @typedef {import('../entities/file')} FileEntity
 */
class AsicManifest {
  /**
   * ASIC manifest constructor.
   * @param {FileEntity[]} [files] Files list.
   * @param {boolean} [withSignature] With signature indicator. Set `true` if this manifest will be signed.
   * @param {object} [dataObject] Data object.
   */
  constructor(files = [], withSignature = true, dataObject = {}) {
    // Save data.
    this.files = files;
    this.withSignature = withSignature;
    this.dataObject = dataObject;
  }

  /**
   * Get data object value.
   * @param {string} asicManifestString ASIC manifest string.
   * @returns {string} Data object value.
   */
  static async getDataObjectValue(asicManifestString) {
    return new Promise((resolve, reject) => {
      xml2js.parseString(asicManifestString, (error, asicManifestObject) => {
        // Check.
        if (error) {
          reject(error);
        }

        // Resolve data object value.
        const dataObjectValue = asicManifestObject.ASiCManifest.DataObject[0]['ns2:DigestValue'][0];
        resolve(dataObjectValue);
      });
    });
  }

  /**
   * Generate manifest content.
   * @returns {string} ASIC manifest content.
   */
  generateManifestContent() {
    // Prepare manifest as JSON object.
    let manifestJson = {
      ASiCManifest: [],
    };
    if (this.withSignature) {
      manifestJson.ASiCManifest.push(this.getSignatureSubobject());
    }
    this.files.forEach((f) => {
      manifestJson.ASiCManifest.push(this.getFileSubobject(f.name, f.contentType, f.hash));
    });
    if (this.dataObject) {
      manifestJson.ASiCManifest.push(this.getDataObjectSubobject(this.dataObject));
    }

    // Convert manifest to XML and return.
    const manifextXml = jsonxml(manifestJson, { escape: true, xmlHeader: { standalone: 'yes' } });
    return manifextXml;
  }

  /**
   * Get signature subobject.
   * @param {string} [uri] Signature URI.
   * @param {string} [mimeType] Signature MIME type.
   */
  getSignatureSubobject(uri = 'META-INF/signature.p7s', mimeType = 'application/x-pkcs7-signature') {
    // Define and return signature subobject.
    return { name: 'SigReference', attrs: { URI: uri, MimeType: mimeType } };
  }

  /**
   * Get file subobject.
   * @param {string} uri File URI.
   * @param {string} mimeType MIME type.
   * @param {{sha1, sha256}} hash File hash object.
   * @returns {object} Files subobject.
   */
  getFileSubobject(uri, mimeType, hash) {
    // Prepatre hash params.
    const hashAlgorithm = hash.sha256 ? 'http://www.w3.org/2001/04/xmlenc#sha256' : 'http://www.w3.org/2000/09/xmldsig#sha1';
    const hashValue = hash.sha256 || hash.sha1;
    const hashValueBase64 = Buffer.from(hashValue, 'hex').toString('base64');

    // Define and return file subobject.
    return {
      name: 'DataObjectReference',
      attrs: { URI: uri, MimeType: mimeType },
      children: [
        { name: 'ns2:DigestMethod', attrs: { Algorithm: hashAlgorithm } },
        { name: 'ns2:DigestValue', text: hashValueBase64 },
      ],
    };
  }

  /**
   * Get data object subobject.
   * @param {object} dataObject Data object.
   * @returns {object} Data object subobject.
   */
  getDataObjectSubobject(dataObject) {
    // Prepatre params.
    const dataEncoding = 'http://www.w3.org/2000/09/xmldsig#base64';
    const dataObjectString = JSON.stringify(dataObject);
    const dataValue = Buffer.from(dataObjectString, 'utf8').toString('base64');
    const dataObjectMimeType = 'application/json';

    // Define and return data object subobject.
    return {
      name: 'DataObject',
      attrs: { MimeType: dataObjectMimeType },
      children: [
        { name: 'ns2:DigestMethod', attrs: { Algorithm: dataEncoding } },
        { name: 'ns2:DigestValue', text: dataValue },
      ],
    };
  }
}

// Export.
module.exports = AsicManifest;
