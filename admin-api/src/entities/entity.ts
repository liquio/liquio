// Constants.
const ERROR_OVERRIDE = 'Method must be override.';
const ERROR_WRONG_ENTITY = 'Item must be Entity.';

export class Entity<T extends object, A extends object = {}> {
  constructor(options?: T) {
    if (options) {
      Object.assign(this, options);
    }
  }

  /**
   * Filter Response.
   * @param [brief] getFilterPropertiesBrief method.
   */
  static filterResponse<T extends object>(data: Array<Entity<T> & T> | (Entity<T> & T), brief = false): Partial<T> | Partial<T>[] {
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
  filter(data: Entity<T> & T, brief: boolean): Partial<T> {
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
  createObjectWithFilteredProperties(data: Entity<T> & T, properties: (keyof T)[]): Partial<T> {
    const filteredObject: Partial<T> = {};

    for (const property of properties) {
      filteredObject[property] = data[property];
    }

    return filteredObject;
  }

  getFilterProperties(): (keyof T | keyof A)[] {
    throw new Error(ERROR_OVERRIDE);
  }

  getFilterPropertiesBrief(): (keyof T | keyof A)[] {
    throw new Error(ERROR_OVERRIDE);
  }
}
