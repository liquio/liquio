// Import.
import { getDb } from '../lib/context';

/**
 * Model.
 */
class Model {
  /**
   * Model constructor.
   */
  constructor() {
    this.db = getDb();
  }

  /**
   * Pagination.
   * @param {number} [perPage] Limit items.
   * @param {number} [currentPage] Offset.
   * @return {Promise<object>}
   */
  async paginate(perPage = 15, currentPage = 1) {
    if (currentPage < 1) {
      currentPage = 1;
    }
    const { count, rows } = await this.findAndCountAll({
      offset: (currentPage - 1) * perPage,
      limit: perPage,
    });
    return {
      pagination: { total: count, perPage: perPage, currentPage: currentPage, lastPage: Math.max(Math.ceil(count / perPage), 1) },
      data: rows,
    };
  }
}

// Export.
export default Model;
