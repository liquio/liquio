const Controller = require('./controller');
const FavoritesModel = require('../models/favorites');

/**
 * Favorites controller.
 */
class FavoritesController extends Controller {
  constructor() {
    if (!FavoritesController.singleton) {
      super();
      this.model = new FavoritesModel().model;
      FavoritesController.singleton = this;
    }
    return FavoritesController.singleton;
  }

  /**
   * Get all
   * @param {string} params.entity_type Entity Type
   * @param {string} userId User Id.
   */
  async getAll({ params: { entity_type }, userId: user_id }) {
    return this.model.findAll({ where: { user_id, entity_type }});
  }

  /**
   * Find one record
   * @param {string} params.entity_type Entity Type
   * @param {string} params.entity_id Entity Id
   * @param {string} userId User Id.
   */
  async getOne({ params: { entity_type, entity_id }, userId: user_id }) {
    return this.model.findOne({ where: { user_id, entity_type, entity_id }});
  }

  /**
   * Add
   * @param {string} params.entity_type Entity Type
   * @param {string} params.entity_id Entity Id
   * @param {string} userId User Id.
   */
  async add({ params: { entity_type, entity_id }, userId: user_id }) {
    return this.model.create({ user_id, entity_type, entity_id });
  }

  /**
   * Remove
   * @param {string} params.entity_type Entity Type
   * @param {string} params.entity_id Entity Id
   * @param {string} userId User Id.
   */
  async remove({ params: { entity_type, entity_id }, userId: user_id }) {
    return this.model.destroy({ where: { user_id, entity_type, entity_id }});
  }
}

module.exports = FavoritesController;
