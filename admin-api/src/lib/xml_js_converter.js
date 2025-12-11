const xml2js = require('xml2js');

/**
 * XML-JS converter.
 */
class XmlJsConverter {
  /**
   * XML-JS converter constructor.
   * @param {number} [space] Default space charecters count.
   */
  constructor(space = 2) {
    // Define singleton.
    if (!XmlJsConverter.singleton) {
      this.space = space;
      this.parseString = xml2js.parseString;
      XmlJsConverter.singleton = this;
    }
    return XmlJsConverter.singleton;
  }

  /**
   * Convert XML to JS object.
   * @param {string} xml XML string.
   * @returns {Promise<object>} JS object promise.
   */
  async convertXmlToJsObject(xml) {
    return new Promise((resolve, reject) => {
      this.parseString(xml, (error, jsObject) => {
        // Check.
        if (error) {
          reject(error);
        }

        // Resolve JS object.
        resolve(jsObject);
      });
    });
  }

  /**
   * Convert XML to JSON string.
   * @param {string} xml XML string.
   * @param {number} [space] Space charecters count.
   * @returns {Promise<string>} JSON string promise.
   */
  async convertXmlToJsonString(xml, space = this.space) {
    // Convert to JS object.
    const jsObject = await this.convertXmlToJsObject(xml);

    // Define and return
    const jsonString = JSON.stringify(jsObject, null, space);
    return jsonString;
  }

  /**
   * Convert JSON object to xml.
   * @param {string} json JSON object.
   * @returns {Promise<string>} XML string promise.
   */
  async convertJsonToXmlString(json) {
    const builder = new xml2js.Builder();
    return builder.buildObject(json);
  }
}

module.exports = XmlJsConverter;
