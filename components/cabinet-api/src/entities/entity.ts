// Constants.
const ERROR_WRONG_ENTITY = 'Item must be Entity.';

/**
 * Base entity class with filtering capabilities
 */
export default class Entity {
  /**
   * Filter and transform entity data for response
   * @param data - Entity or array of entities to filter
   * @param brief - Whether to use brief filter properties
   * @returns Filtered entity data as object or array
   */
  static filterResponse<T extends Entity>(data: T | T[], brief?: boolean): Record<string, unknown> | Record<string, unknown>[] {
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
   * Filter method selecting properties based on brief flag
   * @param data - Entity data object
   * @param brief - Whether to use brief filter properties
   * @returns Filtered object
   */
  filter(data: Entity, brief?: boolean): Record<string, unknown> {
    return brief
      ? data.createObjectWithFilteredProperties(data, (data as any).getFilterPropertiesBrief?.())
      : data.createObjectWithFilteredProperties(data, (data as any).getFilterProperties?.());
  }

  /**
   * Create object with only specified properties
   * @param data - Entity object
   * @param properties - Array of property names to include
   * @returns Filtered object
   */
  createObjectWithFilteredProperties(data: Entity, properties: string[]): Record<string, unknown> {
    const filteredObject: Record<string, unknown> = {};

    if (Array.isArray(properties)) {
      for (const property of properties) {
        filteredObject[property] = (data as any)[property];
      }
    }

    return filteredObject;
  }
}
