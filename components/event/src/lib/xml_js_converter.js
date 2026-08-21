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
   * @param {object} options Options.
   * @returns {Promise<object>} JS object promise.
   */
  async convertXmlToJsObject(xml, options) {
    return new Promise((resolve, reject) => {
      this.parseString(xml, options, (error, jsObject) => {
        // Check.
        if (error) { reject(error); }

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

  /**
   * Normalize Object keys
   * @param {object} data JSON object.
   * @param {object} prefix prefix of keys.
   * @param {object} prefixList prefix list of keys.
   * @param {object} obj JSON object.
   * @returns {object} Normalized object.
   */
  normalizeObj({ data, prefix, prefixList }) {
    if (!data) return;
    if (typeof data !== 'object') return data;

    let result = {};

    let prefixReplace;
    if (Array.isArray(prefixList) && prefixList.length) {
      prefixReplace = new RegExp(`^(${prefixList.join('|')})`);
    } else {
      prefixReplace = new RegExp(`^${prefix}`);
    }

    for (const [k, v] of Object.entries(data)) {
      const key = k.replace(prefixReplace, '');
      let value = v;
      if (Array.isArray(v)) {
        value = v.length <= 1 ? v.shift() : v.map(item => this.normalizeObj({ data: item, prefix, prefixList }));
      }

      result[key] = value && Object.getPrototypeOf(value) === Object.prototype ? this.normalizeObj({
        data: value,
        prefix,
        prefixList
      }) : value;
    }
    return result;
  }
}

module.exports = XmlJsConverter;
