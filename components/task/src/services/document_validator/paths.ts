/**
 * Paths.
 */
export class Paths {
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
    const jsonSchemaPath = dataObjectPath
      .split('.')
      .map((pathPart) => `properties.${pathPart}`)
      .join('.');
    return jsonSchemaPath;
  }

  /**
   * Does a concrete document data path match a path template that may contain `${index}`
   * array-item placeholders (e.g. template `a.${index}.b` matches path `a.2.b`).
   * @param {string} templatePath Path template, possibly with `${index}` segments.
   * @param {string} concretePath Concrete document data path.
   * @returns {boolean} Match indicator.
   */
  static matchesTemplate(templatePath, concretePath) {
    if (typeof templatePath !== 'string' || typeof concretePath !== 'string') {
      return false;
    }

    const templateParts = templatePath.split('.');
    const concreteParts = concretePath.split('.');
    if (templateParts.length !== concreteParts.length) {
      return false;
    }

    return Paths.matchesTemplateParts(templateParts, concreteParts);
  }

  /**
   * Does a concrete document data path match a path template (see `matchesTemplate`) or point
   * somewhere under it (e.g. template `a.${index}.b` matches `a.2.b`, `a.2.b.name` and `a.2.b.0`,
   * but not `a.2` or `a.2.bX`).
   * @param {string} templatePath Path template, possibly with `${index}` segments.
   * @param {string} concretePath Concrete document data path.
   * @returns {boolean} Match indicator.
   */
  static matchesTemplateOrDescendant(templatePath, concretePath) {
    if (typeof templatePath !== 'string' || typeof concretePath !== 'string') {
      return false;
    }

    const templateParts = templatePath.split('.');
    const concreteParts = concretePath.split('.');
    if (concreteParts.length < templateParts.length) {
      return false;
    }

    return Paths.matchesTemplateParts(templateParts, concreteParts.slice(0, templateParts.length));
  }

  /**
   * Do concrete path segments match template path segments of the same length.
   * @param {string[]} templateParts Template path segments.
   * @param {string[]} concreteParts Concrete path segments.
   * @returns {boolean} Match indicator.
   */
  private static matchesTemplateParts(templateParts, concreteParts) {
    return templateParts.every((part, i) => (part === '${index}' ? /^\d+$/.test(concreteParts[i]) : part === concreteParts[i]));
  }

  /**
   * Is a path the same as another path or somewhere under it (`a.b` is under `a`, `a.bc` is not).
   * @param {string} path Path to check.
   * @param {string} ancestorPath Possible ancestor path.
   * @returns {boolean} Is same or descendant path indicator.
   */
  static isSameOrDescendantPath(path, ancestorPath) {
    if (typeof path !== 'string' || typeof ancestorPath !== 'string') {
      return false;
    }

    return path === ancestorPath || path.startsWith(`${ancestorPath}.`);
  }
}
