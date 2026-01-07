const Sequelize = require('sequelize');

const Model = require('./model');
const NumberTemplateEntity = require('../entities/number_template');
const RedisClient = require('../lib/redis_client');
const PgPubSub = require('../lib/pgpubsub');

// Constants.
const DEFAULT_CACHE_TTL = 600; // 10 minutes

class NumberTemplateModel extends Model {
  constructor() {
    if (!NumberTemplateModel.singleton) {
      super();

      this.model = this.db.define(
        'numberTemplate',
        {
          name: Sequelize.STRING,
          template: Sequelize.STRING
        },
        {
          tableName: 'number_templates',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at'
        }
      );

      PgPubSub.getInstance()?.subscribe('number_template_row_change_notify', this.onRowChange.bind(this));

      this.cacheTtl = {
        findById: global.config.cache?.numberTemplate?.findById || DEFAULT_CACHE_TTL
      };

      NumberTemplateModel.singleton = this;
    }

    return NumberTemplateModel.singleton;
  }

  /**
   * Find by ID.
   * @param {string} id
   * @returns {Promise<NumberTemplateEntity>}
   */
  async findById(id) {
    const { data: numberTemplate } = await RedisClient.getOrSet(
      RedisClient.createKey('number_template', 'findById', id),
      () => this.model.findByPk(id),
      this.cacheTtl.findById
    );

    if (!numberTemplate) { return; }

    return new NumberTemplateEntity({
      id: numberTemplate.id,
      name: numberTemplate.name,
      template: numberTemplate.template
    });
  }

  /**
   * Next increment.
   * @param {number} numberTemplateId Number template ID.
   * @returns {Promise<number>}
   */
  async nextIncrement(numberTemplateId) {
    const sequenceName = `number_template_sequence_${numberTemplateId}`;
    const [increment] = await this.model.sequelize.query('SELECT nextval(:sequenceName)', {
      replacements: { sequenceName },
      type: Sequelize.QueryTypes.SELECT
    });

    return increment && increment.nextval;
  }

  /**
   * Invalidate cache on row change.
   * @private
   * @param {string} channel Channel.
   * @param {NotifyData} data Data.
   *
   * @typedef {Object} NotifyData
   * @property {number} id Row ID.
   * @property {'INSERT' | 'UPDATE' | 'DELETE'} action Action.
   * @property {string} table Table name.
   */
  onRowChange(channel, { id }) {
    const redis = RedisClient.getInstance();
    if (redis) {
      redis.delete(RedisClient.createKey('number_template', 'findById', id));
    }
  }
}

module.exports = NumberTemplateModel;
