const Controller = require('./controller');

/**
 * Favorites controller.
 */
class FavoritesController extends Controller {
  constructor() {
    if (!FavoritesController.singleton) {
      super();
      FavoritesController.singleton = this;
    }
    return FavoritesController.singleton;
  }

  /**
   * Get all
   * @param {string} params.entity_type Entity Type
   * @param {string} userId User Id.
   */
  async getAll({ params, userId }) {
    const [result] = await db.query(
      `
      SELECT f.*, COALESCE( f.name, u.name, w.name, wt.name, '' ) entity_name FROM favorites f
      LEFT JOIN units u ON f.entity_type = 'units' AND f.entity_id = CAST(u.id as varchar)
      LEFT JOIN workflows w ON f.entity_type = 'workflows' AND f.entity_id = CAST(w.id as varchar)
      LEFT JOIN workflow_templates wt ON f.entity_type = 'workflow_templates' AND f.entity_id = CAST(wt.id as varchar)
      WHERE f.user_id = :user_id AND f.entity_type = :entity_type
    `,
      { replacements: { user_id: userId, ...params } },
    );

    return result;
  }

  /**
   * Find one record
   * @param {string} params.entity_type Entity Type
   * @param {string} params.entity_id Entity Id
   * @param {string} userId User Id.
   */
  async getOne({ params: { entity_type, entity_id }, userId: user_id }) {
    const [result] = await db.query(
      `
    SELECT f.*, COALESCE( f.name, u.name, w.name, wt.name, '' ) entity_name FROM favorites f
    LEFT JOIN units u ON f.entity_type = 'units' AND f.entity_id = CAST(u.id as varchar)
    LEFT JOIN workflows w ON f.entity_type = 'workflows' AND f.entity_id = CAST(w.id as varchar)
    LEFT JOIN workflow_templates wt ON f.entity_type = 'workflow_templates' AND f.entity_id = CAST(wt.id as varchar)
    WHERE f.user_id = :user_id AND f.entity_type = :entity_type AND f.entity_id = :entity_id
  `,
      { replacements: { user_id, entity_type, entity_id } },
    );

    return result[0];
  }

  /**
   * Add
   * @param {string} params.entity_type Entity Type
   * @param {string} params.entity_id Entity Id
   * @param {string} params.name User-defined entity name.
   * @param {string} userId User Id.
   */
  async add({ params, body: { name, ...body }, userId: user_id }) {
    const entity_type = body.entity_type || params.entity_type;
    const entity_id = body.entity_id || params.entity_id;
    return models.favorites.model.create({ user_id, entity_type, entity_id, name });
  }

  /**
   * Remove
   * @param {string} params.entity_type Entity Type
   * @param {string} params.entity_id Entity Id
   * @param {string} userId User Id.
   */
  async remove({ params: { entity_type, entity_id }, userId: user_id }) {
    return models.favorites.model.destroy({ where: { user_id, entity_type, entity_id } });
  }
}

module.exports = FavoritesController;
