
const Filler = require('./filler');
const RegisterService = require('../../register');

/**
 * Registers filler.
 */
class RegistersFiller extends Filler {
  /**
   * Registers filler constructor.
   */
  constructor() {
    if (!RegistersFiller.singleton) {
      // Init parent constructor.
      super();

      this.registerService = new RegisterService();
      RegistersFiller.singleton = this;
    }
    return RegistersFiller.singleton;
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
    const { userInfo, userUnitsEntities } = options;

    // Handle all schema object pages.
    await this.handleAllElements(schemaObject, objectToFill, async (item, itemSchema) => {
      // Check current element shoudn't be defined.
      if (!itemSchema || typeof itemSchema.value !== 'string'
        || !itemSchema.value.startsWith('registers.keys.')) { return; }

      // Define current value.
      // Sample: "registers.keys.11".
      const {
        value: currentValue,
        filters,
        searchEqual: searchFunction,
        searchEqual2: searchFunction2,
        searchEqual3: searchFunction3,
        searchLike: searchFunctionLike,
        searchLike2: searchFunctionLike2,
        searchLike3: searchFunctionLike3,
        ignoreEmptyFilters = false,
        sortBy
      } = itemSchema;

      // Define registers key ID.
      // Sample: 11.
      const keyId = parseInt(currentValue.split('.').pop());

      // Defined search equal.
      // Sample: "(data) => { return (data?.calculated?.institutionName)  || 'unknown'; }",
      let searchEqual;
      let searchEqual2;
      let searchEqual3;
      if (searchFunction) {
        try {
          searchEqual = this.sandbox.evalWithArgs(searchFunction, [objectToFill, userInfo]);
        } catch (error) {
          log.save('registers-field-filling|search-equal-1-eval-error', { error: error && error.message || error }, 'error');
        }
      }
      if (searchFunction2) {
        try {
          searchEqual2 = this.sandbox.evalWithArgs(searchFunction2, [objectToFill, userInfo]);
        } catch (error) {
          log.save('registers-field-filling|search-equal-2-eval-error', { error: error && error.message || error }, 'error');
        }
      }
      if (searchFunction3) {
        try {
          searchEqual3 = this.sandbox.evalWithArgs(searchFunction3, [objectToFill, userInfo]);
        } catch (error) {
          log.save('registers-field-filling|search-equal-3-eval-error', { error: error && error.message || error }, 'error');
        }
      }

      // Define search like.
      let searchLike;
      let searchLike2;
      let searchLike3;
      if (searchFunctionLike) {
        try {
          searchLike = this.sandbox.evalWithArgs(searchFunctionLike, [objectToFill, userInfo]);
        } catch (error) {
          log.save('registers-field-filling|search-like-1-eval-error', { error: error && error.message || error }, 'error');
        }
      }
      if (searchFunctionLike2) {
        try {
          searchLike2 = this.sandbox.evalWithArgs(searchFunctionLike2, [objectToFill, userInfo]);
        } catch (error) {
          log.save('registers-field-filling|search-like-2-eval-error', { error: error && error.message || error }, 'error');
        }
      }
      if (searchFunctionLike3) {
        try {
          searchLike3 = this.sandbox.evalWithArgs(searchFunctionLike3, [objectToFill, userInfo]);
        } catch (error) {
          log.save('registers-field-filling|search-like-3-eval-error', { error: error && error.message || error }, 'error');  
        }
      }

      // Define registers key filters.
      // Format filters if exists.
      let filtersObject = {};
      if (filters) for (const filter of filters) {
        // Filter value container.
        let filterValue = filter.value;

        // Define for "user.".
        if (typeof filter.value === 'string' && filter.value.startsWith('user.')) {
          if (!userInfo) { return; }
          filterValue = this.sandbox.evalWithArgs(
            `user => ${filter.value}`,
            [userInfo],
            { meta: { fn: 'RegistersFiller.fill.filters', filterName: filter.name } },
          );
        }

        // Define for "({". Sample: "({users, units}) => { return ((units && units.all || []).find(v => (v.basedOn || []).includes(21)) || {}).id; }".
        if (typeof filter.value === 'string' && filter.value.startsWith('({')) {
          if (!userInfo) { return; }
          filterValue = this.sandbox.evalWithArgs(
            `${filter.value}`,
            [{ user: userInfo, units: userUnitsEntities, documentData: objectToFill }],
            { meta: { fn: 'RegistersFiller.fill.filters', filterName: filter.name } },
          );
        }

        // Check if no need to save filter.
        if (ignoreEmptyFilters && typeof filterValue === 'undefined') { continue; }

        // Append filter.
        filtersObject[filter.name] = filterValue;
      }

      // Format sorting if exists.
      const sort = {};
      if (sortBy && typeof sortBy === 'object') for (const [sortKey, sortValue] of Object.entries(sortBy)) {
        sort[sortKey] = sortValue;
      }

      // Fill current element.
      let valueToSet;
      try {
        // Get records.
        const registerParams = {
          offset: 0,
          limit: itemSchema.limit || 10,
          key_id: keyId,
          data: filtersObject,
          sort,
          allow_see_all_records: true,
          search: searchLike,
          search_2: searchLike2,
          search_3: searchLike3,
          search_equal: searchEqual,
          search_equal_2: searchEqual2,
          search_equal_3: searchEqual3,
        };
        const records = await this.registerService.getFilteredRecords(registerParams, {});

        // Define value to set.
        if (Array.isArray(records.data)) {
          valueToSet = records.data.map(v => ({ ...v.data, registerId: v.registerId, keyId: v.keyId, recordId: v.id }));
        }
      } catch (error) { log.save('registers-field-filling-error', { error: error && error.message || error }, 'warn'); }

      // Return value to set.
      return valueToSet;
    });

    // Return filled object.
    return objectToFill;
  }
}

module.exports = RegistersFiller;
