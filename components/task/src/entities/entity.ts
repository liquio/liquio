import get from 'lodash/get';
import set from 'lodash/set';

// Constants.
const ERROR_WRONG_ENTITY = 'Item must be Entity.';

export class Entity {
  /**
   * Filter Response.
   * @param data Data.
   * @param brief getFilterPropertiesBrief method.
   */
  static filterResponse(data: Entity | Entity[], brief = false): Record<string, unknown> | Record<string, unknown>[] {
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
   * @param data Data.
   * @param brief Brief state.
   */
  filter(data: Entity, brief: boolean): Record<string, unknown> {
    const dataAsRecord = data as unknown as Record<string, unknown>;
    return brief
      ? data.createObjectWithFilteredProperties(dataAsRecord, data.getFilterPropertiesBrief())
      : data.createObjectWithFilteredProperties(dataAsRecord, data.getFilterProperties());
  }

  /**
   * Create object with filtered properties.
   * @private
   * @param data Entity object.
   * @param properties Entity properties.
   */
  createObjectWithFilteredProperties(data: Record<string, unknown>, properties: string[]): Record<string, unknown> {
    const filteredObject: Record<string, unknown> = {};

    for (const property of properties) {
      if (property.indexOf('.') !== -1) {
        set(filteredObject, property, get(data, property));
      } else {
        filteredObject[property] = data[property];
      }
    }

    return filteredObject;
  }

  /** Every concrete subclass must list which of its own fields are safe to expose. */
  getFilterProperties(): string[] {
    throw new Error('getFilterProperties must be implemented by subclass.');
  }

  /** Brief variant of {@link getFilterProperties}, used where a smaller payload is wanted. */
  getFilterPropertiesBrief(): string[] {
    throw new Error('getFilterPropertiesBrief must be implemented by subclass.');
  }
}
