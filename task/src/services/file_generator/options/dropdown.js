
const Option = require('./option');

/**
 * Dropdown option.
 */
class DropdownOption extends Option {
  /**
   * Get dropdown options.
   * @param {object} options Options.
   * @param {object} options.documentTemplateSchema Document template schema.
   * @param {object} options.documentData Document data.
   */
  get({ documentTemplateSchema, documentData }) {
    // Check input params.
    if (typeof documentData !== 'object' || typeof documentTemplateSchema !== 'object' || typeof documentTemplateSchema.properties !== 'object') {
      return {};
    }

    let data = {};

    const steps = Object.keys(documentTemplateSchema.properties);

    for (const stepName of steps) {
      if (!documentTemplateSchema.properties[stepName].properties) {
        continue;
      }

      const fields = Object.keys(documentTemplateSchema.properties[stepName].properties);
      for (const fieldName of fields) {
        const field = documentTemplateSchema.properties[stepName].properties[fieldName];

        if (
          field.type !== 'string' ||
          typeof field.options === 'undefined' ||
          typeof documentData[stepName] === 'undefined' ||
          typeof documentData[stepName][fieldName] === 'undefined'
        ) {
          continue;
        }

        const option = field.options.find(v => v.id === documentData[stepName][fieldName]);
        if (!option) {
          continue;
        }

        data[`${stepName}.${fieldName}`] = option.name;
      }
    }

    return data;
  }
}

module.exports = DropdownOption;
