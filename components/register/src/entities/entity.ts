import objectPath from 'object-path';

/**
 * Entity.
 */
export default class Entity {
  data: object = {};

  /**
   * Filter entity.
   * @param {array} paths Paths.
   */
  filterEntity(paths = []) {
    if (this.data && paths) {
      const preparedResponse = {};

      for (const path of paths) {
        const result = objectPath.get(this.data, path);
        objectPath.set(preparedResponse, path, result);
      }

      this.data = preparedResponse;
    }
  }
}
