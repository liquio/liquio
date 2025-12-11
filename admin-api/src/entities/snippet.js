const Entity = require('./entity');

/**
 * Snippets entity.
 */
class SnippetsEntity extends Entity {
  /**
   * Constructor.
   * @param {object} options Snippet object.
   * @param {number} options.id Snippet ID.
   * @param {string} options.name Snippet name.
   * @param {string} options.type Snippet type.
   * @param {import('./snippet_group')} options.snippetGroup Snippet group.
   * @param {string} options.data Snippet data.
   * @param {Date} options.createdAt Created at.
   * @param {Date} options.updatedAt Updated at.
   */
  constructor({ id, name, type, snippetGroup, data, createdAt, updatedAt }) {
    super();

    this.id = id;
    this.name = name;
    this.type = type;
    this.snippetGroup = snippetGroup;
    this.data = data;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = SnippetsEntity;
