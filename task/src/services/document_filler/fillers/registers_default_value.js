const Filler = require('./filler');
const RegisterService = require('../../register');

/**
 * Registers filler.
 */
class RegistersDefaultValueFiller extends Filler {
  /**
   * Registers filler constructor.
   */
  constructor() {
    if (!RegistersDefaultValueFiller.singleton) {
      // Init parent constructor.
      super();

      this.registerService = new RegisterService();
      RegistersDefaultValueFiller.singleton = this;
    }
    return RegistersDefaultValueFiller.singleton;
  }

  /**
   * Fill.
   * @param {object} schemaObject Schema object.
   * @param {object} objectToFill Object to fill.
   * @param {object} options Options.
   * @param {object} options.userInfo User info.
   * @returns {object} Filled object.
   */
  async fill(schemaObject, objectToFill = {}, options = {}) {
    // Get options.
    const { userInfo } = options;

    // Handle all schema object pages.
    await this.handleAllElements(schemaObject, objectToFill, async (item, itemSchema) => {
      // Check current element shoudn't be defined.
      if (
        !itemSchema ||
        itemSchema.control !== 'register' ||
        typeof itemSchema.keyId !== 'number' ||
        typeof itemSchema.defaultValue !== 'string' ||
        itemSchema.defaultValue.split('=').length !== 2
      ) {
        return;
      }

      // Define default value.
      // Sample: "code=804".
      const { defaultValue, keyId, filters, multiple } = itemSchema;
      const [recordProperty, recordValue] = defaultValue.split('=');

      // Define registers key filters.
      // Format filters if exists.
      let filtersObject = {};
      filtersObject[recordProperty] = recordValue;
      if (filters) {
        for (const filter of filters) {
          if (!userInfo) {
            return;
          }

          const filterValue =
            typeof filter.value === 'string' && filter.value.startsWith('user.')
              ? this.sandbox.evalWithArgs(`user => ${filter.value}`, [userInfo], {
                meta: { fn: 'RegistersDefaultValueFiller.fill.filters', filterName: filter.name },
              })
              : filter.value;

          filtersObject[filter.name] = filterValue;
        }
      }

      // Fill current element.
      let valuesToSet;
      try {
        // Get records.
        const registerParams = {
          offset: 0,
          limit: 10,
          key_id: keyId,
          data: filtersObject,
          allow_see_all_records: true,
        };
        const [records, recordKey] = await Promise.all([
          this.registerService.getFilteredRecords(registerParams, {}),
          this.registerService.findKeyById(keyId),
        ]);
        const { schema: keySchema, toString: keyToString } = recordKey;

        // Define value to set.
        if (Array.isArray(records.data)) {
          valuesToSet = records.data.map((v) => {
            const normalizedRecord = {
              /*...v.data, */ registerId: v.registerId,
              keyId: v.keyId,
              id: v.id,
              value: v.id,
            };
            const recordEntries = Object.entries(v.data);
            for (const recordEntry of recordEntries) {
              const [entryKey, entryValue] = recordEntry;
              if (keySchema.properties && keySchema.properties[entryKey] && keySchema.properties[entryKey].public) {
                normalizedRecord[entryKey] = entryValue;
              }
            }
            try {
              normalizedRecord.stringified = this.sandbox.evalWithArgs(keyToString, [v], {
                meta: { fn: 'RegistersDefaultValueFiller.fill.records', record: v },
              });
              normalizedRecord.label = normalizedRecord.stringified;
            } catch {
              log.save('can-not-define-stringified-text', { record: v }, 'warn');
            }
            return normalizedRecord;
          });
        }
      } catch (error) {
        log.save('registers-default-value-field-filling-error', { error: (error && error.message) || error }, 'warn');
      }

      // Return value to set.
      return multiple ? valuesToSet : valuesToSet[0];
    });

    // Return filled object.
    return objectToFill;
  }
}

module.exports = RegistersDefaultValueFiller;
