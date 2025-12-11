// Constants.
const ERROR_OVERRIDE = 'Method must be override.';
const ERROR_WRONG_ENTITY = 'Item must be Entity.';

class Entity {

  /**
   * Filter Response.
   * @param {Entity[]|Entity} data Data.
   * @param {boolean} [brief] getFilterPropertiesBrief method.
   * @returns {array|object}
   */
  static filterResponse(data, brief = false) {
    if (Array.isArray(data)) {
      if (!data.every((item) => item instanceof Entity)) {
        throw new Error(ERROR_WRONG_ENTITY);
      }

      return data.map((item) => item.filter(item, brief));
    }

    if (!(data instanceof Entity)) {
      throw new Error(ERROR_WRONG_ENTITY);
    }

    return data.filter(data, brief);
  }

  /**
   * Filter method getFilterProperties or getFilterPropertiesBrief.
   * @private
   * @param {object} data Data.
   * @param {boolean} brief Brief state.
   * @returns {object}
   */
  filter(data, brief) {
    return brief
      ? data.createObjectWithFilteredProperties(data, data.getFilterPropertiesBrief())
      : data.createObjectWithFilteredProperties(data, data.getFilterProperties());
  }

  /**
   * Create object with filtered properties.
   * @private
   * @param {object} data Entity object.
   * @param {string[]} properties Entity properties.
   * @returns {object}
   */
  createObjectWithFilteredProperties(data, properties) {
    let filteredObject = {};

    for (const property of properties) {
      filteredObject[property] = data[property];
    }

    return filteredObject;
  }

  getFilterProperties() {
    throw new Error(ERROR_OVERRIDE);
  }

  getFilterPropertiesBrief() {
    throw new Error(ERROR_OVERRIDE);
  }
}

module.exports = Entity;
