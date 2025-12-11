const Entity = require('./entity');

/**
 * Snippet group entity.
 */
class SnippetGroupEntity extends Entity {
  /**
   * Constructor.
   * @param {object} options Snippet object.
   * @param {number} options.id Snippet ID.
   * @param {string} options.name Snippet name.
   * @param {Date} options.createdAt Created at.
   * @param {Date} options.updatedAt Updated at.
   */
  constructor({ id, name, createdAt, updatedAt }) {
    super();

    this.id = id;
    this.name = name;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = SnippetGroupEntity;
