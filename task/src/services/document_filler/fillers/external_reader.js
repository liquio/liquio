
const Filler = require('./filler');
const ExternalReader = require('../../../lib/external_reader');

/**
 * External Reader filler.
 */
class ExternalReaderFiller extends Filler {
  /**
   * External Reader filler constructor.
   */
  constructor() {
    if (!ExternalReaderFiller.singleton) {
      // Init parent constructor.
      super();

      this.externalReader = new ExternalReader();
      ExternalReaderFiller.singleton = this;
    }
    return ExternalReaderFiller.singleton;
  }

  /**
   * Fill.
   * @param {object} schemaObject Schema object.
   * @param {object} objectToFill Object to fill.
   * @param {object} options Options.
   * @param {object} options.userInfo User info.
   * @param {object} options.userUnitsEntities User units entities.
   * @param {string} options.oauthToken OAuth user token.
   * @returns {object} Filled object.
   */
  async fill(schemaObject, objectToFill = {}, options = {}) {
    // Get options.
    const { userInfo, userUnitsEntities, oauthToken, documents, allProcessDocuments, events } = options;
    const userUnits = this.getUserUnitIds(userUnitsEntities);

    // Handle all schema object pages.
    await this.handleAllElements(schemaObject, objectToFill, async (item, itemSchema) => {
      // Check current element shoudn't be defined.
      if (!itemSchema || typeof itemSchema.value !== 'string'
        || !itemSchema.value.startsWith('external-reader.')) { return; }

      // Define current value.
      const { value: currentValue, filters } = itemSchema;
      const normalizedFilters = await this.normalizeFilters(filters, objectToFill, documents, allProcessDocuments, events);

      // Define External Reader service and method.
      const [service, method] = currentValue.split('.').slice(1);

      // Fill current element.
      let valueToSet;
      try {
        // Get External Reader records.
        const records = await this.externalReader.getDataByUser(
          service,
          method,
          undefined,
          oauthToken,
          userInfo,
          normalizedFilters,
          undefined,
          userUnits,
          options.enabledMocksHeader
        );

        // Define value to set.
        if (records && typeof records.data !== 'undefined') {
          valueToSet = records.data;
        }
      } catch (error) { log.save('external-services-field-filling-error', { error: error && error.message || error }, 'warn'); }

      // Return value to set.
      return valueToSet;
    });

    // Return filled object.
    return objectToFill;
  }

  /**
   * Get user unit IDs.
   * @param {object} userUnitsEntities User units entities.
   * @returns {{head: number[], member: number[], all: number[]}} Unit IDs.
   */
  getUserUnitIds(userUnitsEntities = { head: [], member: [], all: [] }) {
    const { head = [], member = [], all = [] } = userUnitsEntities;
    return {
      head: head.map(v => v.id),
      member: member.map(v => v.id),
      all: all.map(v => v.id)
    };
  }

  /**
   * Normalize filters.
   * @param {object} filters Filters.
   * @param {object} objectToFill Object to fill (document data).
   * @param {Array<Object>} documents Current only documents (with isCurrent = true).
   * @param {Array<Object>} allProcessDocuments
   * @param {Array<Object>} events
   * @returns {object} Normalized filters.
   */
  async normalizeFilters(filters, objectToFill, documents, allProcessDocuments, events) {
    // Check if not filters.
    if (typeof filters !== 'object' || Array.isArray(filters)) { return filters; }

    // Normalize filters.
    let normalizedFilters = {};
    for (const [key, value] of Object.entries(filters)) {
      // Check if value is string.
      if (typeof value === 'string') {
        // Check if value is external reader.
        if (value.startsWith('(') && value.includes('=>')) {
          try {
            normalizedFilters[key] = this.sandbox.evalWithArgs(
              value,
              [objectToFill, { currentOnlyDocuments: documents, documents: allProcessDocuments, events }],
              { meta: { fn: 'ExternalReaderFiller.normalizeFilters', key } },
            );
          } catch (error) {
            log.save('external-reader-filer-function-calling-error', error, 'warn');
            normalizedFilters[key] = value;
          }
        } else {
          normalizedFilters[key] = value;
        }
      } else {
        normalizedFilters[key] = value;
      }
    }
    return normalizedFilters;
  }
}

module.exports = ExternalReaderFiller;
