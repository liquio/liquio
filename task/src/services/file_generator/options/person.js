
const Option = require('./option');

// Constants.
const EMPTY_CONTENT_ITEM_PART = '';
const OTHER_PERSON_KEY = 'otherPerson';

/**
 * Person option.
 */
class PersonOption extends Option {
  /**
   * Get persons options.
   * @param {object} options Options.
   * @param {object} options.documentData Document data.
   * @param {object} options.staticFilePersonsOptions Static file persons options.
   * @returns {Promise<object>} Persons options object promise.
   */
  async get({ documentData, staticFilePersonsOptions }) {
    // Check input params.
    if (typeof documentData !== 'object') {
      return {};
    }

    // Persons options container.
    let personsOptions = {};

    // Check all person keys.
    const personsKeys = staticFilePersonsOptions?.keys || [];
    for (const personsKey of personsKeys) {
      // Define params.
      const personsData = documentData[personsKey.path];
      if (typeof personsData !== 'object' || personsData === null) {
        continue;
      }
      const personsDataArray = Array.isArray(personsData) ? personsData : [personsData];

      // Handle current persons array.
      const allContentKey = staticFilePersonsOptions.allContentKey;
      const currentContent = await this.createContent(personsKey, personsDataArray, staticFilePersonsOptions);
      const optionsPath = `${personsKey.path}.${allContentKey}`;
      personsOptions[optionsPath] = currentContent;
    }

    // Return persons options.
    return personsOptions;
  }

  /**
   * Create content.
   * @param {{path, text}} personsKey Persons key.
   * @param {{personType, name, email, phone, address, ipn}[]} personsData Persons data list.
   * @param {object} staticFilePersonsOptions Statoc file persons options.
   * @returns {Promise<string>} HTML content with persons info promise.
   */
  async createContent(personsKey, personsData, staticFilePersonsOptions) {
    // Define params.
    const isIndexNeeded = personsData.length > 1 && personsKey.path !== OTHER_PERSON_KEY;
    const { keyTextPrefix, keyTextSuffix, keysSeparator, keyAndSubkeysSeparator } = staticFilePersonsOptions;

    // Define content parts.
    const contentPartsPromises = personsData.map(
      async (personData, index) => `${keyTextPrefix}${personsKey.text} ${isIndexNeeded ? `${index + 1}` : ''}${keyTextSuffix}${keyAndSubkeysSeparator}
        ${await this.createContentItem(personData, staticFilePersonsOptions)}`
    );
    const contentParts = await Promise.all(contentPartsPromises);

    // Define and return content string.
    const contentString = contentParts.join(keysSeparator);
    return contentString;
  }

  /**
   * Create content item.
   * @param {{name, email, phone, address, ipn}} personData Person data.
   * @param {object} staticFilePersonsOptions Static file persons options.
   * @returns {string} Content item.
   */
  async createContentItem(personData, staticFilePersonsOptions) {
    // Check.
    if (typeof personData !== 'object') {
      return '';
    }

    // Define params.
    const { subkeysSeparator } = staticFilePersonsOptions;
    const isLegalPerson = !!personData.isLegal;

    // Define content item parts.
    const personsSubkeys = staticFilePersonsOptions.subkeys;
    const contentItemPartsPromises = personsSubkeys.map(
      async subkey =>
        personData[subkey.path] && (!Array.isArray(subkey.allowedIsLegal) || subkey.allowedIsLegal.some(v => v === isLegalPerson))
          ? `${subkey.text} ${personData[subkey.path]}`
          : EMPTY_CONTENT_ITEM_PART
    );
    const contentItemParts = (await Promise.all(contentItemPartsPromises)).filter(contentItemPart => contentItemPart !== EMPTY_CONTENT_ITEM_PART);

    // Define and return content items string.
    const contentItemString = contentItemParts.join(subkeysSeparator);
    return contentItemString;
  }
}

module.exports = PersonOption;
