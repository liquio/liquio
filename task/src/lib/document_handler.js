/**
 * Document handler.
 */
class DocumentHandler {
  /**
   * Get schema child properties.
   * @param {object} itemSchemaObject Item schema object.
   * @returns {{schemaObject: object, schemaPath: string, path: string}[]} Child properties.
   */
  static getSchemaChildProperties(itemSchemaObject = {}, pathToSchemaItem = '', pathToItem = '') {
    // Define child items keys.
    const { properties = {} } = itemSchemaObject || {};
    const childItemsKeys = Object.keys(properties);

    // Properties container.
    let propertiesContainer = [];

    // Handle child items keys.
    childItemsKeys.forEach(childItemKey => {
      // Define and save child properties data.
      const childItemSchemaObject = properties[childItemKey];
      const pathToSchemaChildItem = pathToSchemaItem ? `${pathToSchemaItem}.properties.${childItemKey}` : `properties.${childItemKey}`;
      const pathToChildItem = pathToItem ? `${pathToItem}.${childItemKey}` : `${childItemKey}`;
      propertiesContainer.push({
        schemaObject: childItemSchemaObject,
        schemaPath: pathToSchemaChildItem,
        path: pathToChildItem
      });

      // Define and save next level child properties.
      const nextLevelChildProperties = DocumentHandler.getSchemaChildProperties(childItemSchemaObject, pathToSchemaChildItem, pathToChildItem);
      propertiesContainer.push(...nextLevelChildProperties);
    });

    // Return properties.
    return propertiesContainer;
  }
}

module.exports = DocumentHandler;
