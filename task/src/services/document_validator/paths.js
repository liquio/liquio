/**
 * Paths.
 */
class Paths {
  /**
   * Get JSON schema path.
   * @param {string} dataObjectPath Data object path as "page.item".
   * @returns {string} JSON schema path as "properties.page.properties.item".
   */
  static getJsonSchemaPath(dataObjectPath) {
    // Check input params.
    if (typeof dataObjectPath !== 'string') { 
      return;
    }

    // Return schema path.
    const jsonSchemaPath = dataObjectPath.split('.').map(pathPart => `properties.${pathPart}`).join('.');
    return jsonSchemaPath;
  }
}

module.exports = Paths;
