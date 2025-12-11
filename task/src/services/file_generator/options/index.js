
const Option = require('./option');
const GlobalOption = require('./global');
const DropdownOption = require('./dropdown');
const PersonOption = require('./person');

// Constants.
const OPTION_CLASSES = [GlobalOption, DropdownOption, PersonOption];
const EMPTY_STRING = '';
const ERROR_BASE_MODEL = 'Must be extends of Option.';

/**
 * Options.
 */
class Options {
  /**
   * Constructor.
   * @param {typeof Option[]} customOptions Custom option list.
   */
  constructor(customOptions = []) {
    // Define singleton.
    if (!Options.singleton) {
      this.initOptions(customOptions);
      Options.singleton = this;
    }
    return Options.singleton;
  }

  /**
   * Init options.
   * @param {typeof Option[]} customOptions Custom options.
   * @private
   */
  initOptions(customOptions) {
    const options = [...OPTION_CLASSES, ...customOptions];

    this.options = [];

    for (const option of options) {
      const instance = new option();

      if (!(instance instanceof Option)) {
        throw new Error(ERROR_BASE_MODEL);
      }

      this.options.push(instance);
    }
  }

  /**
   * Get options.
   * @param {object} options Options.
   * @param {object} options.documentTemplateSchema Document template schema.
   * @param {object} options.documentData Document data.
   * @param {object} options.staticFileOptions Static file options.
   * @returns {Promise<object>}
   */
  async getOptions({ documentTemplateSchema, documentData, staticFileOptions }) {
    // Options container.
    let options = {};

    // Check all steps.
    for (const stepKey in documentData) {
      // Current step value.
      const stepValue = documentData[stepKey];
      if (typeof stepValue !== 'object') {
        options[stepKey] = stepValue;
        continue;
      }

      // Get all step properties.
      for (const propertyKey in stepValue) {
        // Current property value.
        const propertyValue = stepValue[propertyKey];

        // Check if subkeys not exists.
        if (typeof propertyValue !== 'object' || propertyValue === null) {
          // Append value.
          const propertyValueString = `${propertyValue !== null ? propertyValue : ''}`;
          options[`${stepKey}.${propertyKey}`] = propertyValueString;
          continue;
        }

        // Handle subkey.
        for (const propertySubkey in propertyValue) {
          // Current property subvalue.
          const propertySubvalue = propertyValue[propertySubkey];

          // Append value.
          if (typeof propertySubvalue !== 'object') {
            const propertySubvalueString = `${propertySubvalue !== null ? propertySubvalue : ''}`;
            options[`${stepKey}.${propertyKey}.${propertySubkey}`] = propertySubvalueString;
          }
        }
      }
    }

    const staticFilePersonsOptions = staticFileOptions.persons;
    for (const option of this.options) {
      options = { ...options, ...option.get({ documentTemplateSchema, documentData, staticFilePersonsOptions }) };
    }

    // Return options object.
    return options;
  }

  /**
   * Replace all keys.
   * @private
   * @param {string} html HTML content.
   * @param {object} options Options as kev-value object. Sample: { 'user.url': 'http://example.com' }.
   * @returns {string} HTML content with replaced keys.
   */
  replaceAllKeys(html, options) {
    // New text container.
    let newText = html;

    // Handle all options keys.
    for (const key in options) {
      const replacePattern = new RegExp(`\\{${key}\\}`, 'g');
      newText = newText.replace(replacePattern, options[key]);
    }

    // Return new text with all keys replaced.
    return newText;
  }

  /**
   * Clear not replaced keys.
   * @param {string} html HTML content.
   * @returns {string} HTML content without not replaced keys.
   */
  clearNotReplacedKeys(html) {
    // Define clearing pattern.
    const clearingPattern = new RegExp('\\{[a-zA-Z0-9]+(\\.[a-zA-Z0-9]+)+\\}', 'g');

    // Clear by pattern.
    const newText = html.replace(clearingPattern, EMPTY_STRING);
    return newText;
  }
}

module.exports = Options;
