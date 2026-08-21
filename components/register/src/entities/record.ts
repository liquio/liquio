import Entity from './entity';

/**
 * Record entity.
 * @typedef {import('./key')} KeyEntity Key entity.
 */
export default class RecordEntity extends Entity {
  id: string;
  registerId: number;
  keyId: number;
  data: object;
  meta: string;
  allowTokens: string[];
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  signature: string;
  searchString: string;
  searchString2: string;
  searchString3: string;
  isEncrypted: boolean;

  /**
   * Constructor.
   * @param {object} raw Register RAW object.
   * @param {string} raw.id ID.
   * @param {number} raw.register_id Register ID.
   * @param {number} raw.key_id Key ID.
   * @param {object} raw.data Data.
   * @param {string} raw.meta Meta.
   * @param {string[]} raw.allow_tokens Allow Tokens.
   * @param {string} raw.created_by Created by.
   * @param {string} raw.updated_by Updated by.
   * @param {string} raw.created_at Created at.
   * @param {string} raw.updated_at Updated at.
   * @param {string} raw.signature Record data signature.
   * @param {boolean} raw.is_encrypted Is record data encrypted.
   * @param {boolean} [withSearchStrings=false] With search strings.
   */
  constructor(
    {
      id,
      register_id,
      key_id,
      data,
      meta,
      allow_tokens,
      created_by,
      updated_by,
      created_at,
      updated_at,
      signature,
      search_string,
      search_string_2,
      search_string_3,
      is_encrypted
    },
    withSearchStrings = false
  ) {
    super();

    this.id = id;
    this.registerId = register_id;
    this.keyId = key_id;
    this.data = data;
    this.meta = meta;
    this.allowTokens = allow_tokens;
    this.createdBy = created_by;
    this.updatedBy = updated_by;
    this.createdAt = created_at;
    this.updatedAt = updated_at;
    this.signature = signature;
    if (withSearchStrings) {
      this.searchString = search_string;
      this.searchString2 = search_string_2;
      this.searchString3 = search_string_3;
    }
    this.isEncrypted = is_encrypted;
  }

  applyResponseFieldsRules(key) {
    if (!key.schema?.responseFields || !this.data || Object.keys(this.data).length === 0) {
      return this;
    }

    if (!Array.isArray(key.schema.responseFields) || key.schema.responseFields.some((field) => typeof field !== 'string')) {
      throw new Error(`Invalid responseFields rules for key ${key.id}`);
    }

    const responseFields = []
      .concat(key.schema.responseFields)
      .filter((field) => typeof field === 'string' && field.length > 0)
      .map((field) => field.split('.'));

    const transform = (object = null, rules = []) => {
      if (!object || !Array.isArray(rules) || typeof object !== 'object') {
        return object;
      }

      const currentRules = rules.map((rule) => rule[0]).filter(Boolean);

      if (currentRules.includes('**')) {
        return object;
      }

      if (Array.isArray(object)) {
        return object
          .filter((item, index) => {
            return currentRules.includes(String(index)) || currentRules.includes('*');
          })
          .map((item, index) => {
            const nextRules = rules.filter((rule) => ['*', String(index)].includes(rule[0])).map((rule) => rule.slice(1));
            // .filter(rule => rule.length > 0);

            if (nextRules.flat().length === 0) {
              return item;
            }

            return transform(item, nextRules);
          });
      }

      return Object.keys(object)
        .filter((key) => currentRules.includes(key) || currentRules.includes('*'))
        .reduce((acc, key) => {
          const nextRules = rules.filter((rule) => ['*', key].includes(rule[0])).map((rule) => rule.slice(1));
          // .filter(rule => rule.length > 0);

          if (nextRules.flat().length === 0) {
            return {
              ...acc,
              [key]: object[key]
            };
          }

          return {
            ...acc,
            [key]: transform(object[key], nextRules)
          };
        }, {});
    };

    this.data = transform(this.data, responseFields);
    return this;
  }

  /**
   * Apply column-level security.
   * @param {KeyEntity} key Key entity.
   * @param {string[]} [allowTokens] Allow tokens.
   */
  applyColumnLevelSecurity(key, allowTokens = []) {
    // Check if no need to handle record.
    if (!this.data || Object.keys(this.data).length === 0) {
      // Return current entity without handling.
      return this;
    }

    // Handle schema.
    const keySchemaProperties = (key.schema && key.schema.properties) || {};
    for (const [schemaPropertyKey, schemaPropertyValue] of Object.entries(keySchemaProperties)) {
      // Check schema allow tokens.
      const schemaAllowTokens = schemaPropertyValue['allowTokens'];
      if (!schemaAllowTokens) {
        continue;
      }

      // Check if need to remove record properties.
      if (!schemaAllowTokens.some((sat) => allowTokens.includes(sat))) {
        delete this.data[schemaPropertyKey];
      }
    }

    // Return current entity after handling.
    return this;
  }
}
