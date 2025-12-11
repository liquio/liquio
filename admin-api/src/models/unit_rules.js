const Sequelize = require('sequelize');
const Model = require('./model');
const UnitRulesEntity = require('../entities/unit_rules');

class UnitRulesModel extends Model {
  constructor(dbInstance) {
    if (!UnitRulesModel.singleton) {
      super(dbInstance);

      this.model = this.db.define(
        'unit_rules',
        {
          unit_rule_type: Sequelize.ENUM('exclusive'),
          rule_schema: { type: Sequelize.JSONB, defaultValue: {} },
        },
        {
          tableName: 'unit_rules',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      UnitRulesModel.singleton = this;
    }

    return UnitRulesModel.singleton;
  }

  /**
   * Get all rules by type.
   * @param {string} ruleType Unit rule type.
   */
  async getRulesByType(ruleType) {
    const whereClause = { unit_rule_type: ruleType };
    const unitRulesRaw = await this.model.findAll({ where: whereClause });

    const unitRules = unitRulesRaw.map((item) => {
      return this.prepareEntity(item);
    });

    return unitRules && unitRules[0] && unitRules[0].ruleSchema && unitRules[0].ruleSchema.list;
  }

  /**
   * Get all.
   * @returns {Promise<UnitRulesEntity[]>}
   */
  async getAll() {
    const rules = await this.model.findAll();

    const rulesEntities = rules.map((item) => {
      return this.prepareEntity(item);
    });

    return rulesEntities;
  }

  /**
   * Create.
   * @param {object} data Data object.
   * @param {string} data.type Rule type.
   * @param {string} data.ruleSchema Rule schema.
   * @returns {Promise<UnitRulesEntity>} User inbox promise.
   */
  async create({ type, ruleSchema }) {
    // Check if no record with this type.
    const rulesWithCurrentType = await this.model.findOne({ where: { unit_rule_type: type } });
    if (rulesWithCurrentType) {
      throw new Error('Unit rules with this type already exist!');
    }

    // Prepare record.
    const unitRulesModel = this.prepareForModel({ type, ruleSchema });

    // Create and return record.
    const createdUnitRules = await this.model.create(unitRulesModel);

    return this.prepareEntity(createdUnitRules);
  }

  /**
   * Update rules.
   * @param {object} data Data object.
   * @param {string} data.type Rule type.
   * @param {string} data.ruleSchema Rule schema.
   * @returns {Promise<UnitRulesEntity>} User inbox promise.
   */
  async update({ type, ruleSchema }) {
    const data = await this.model.update(this.prepareForModel({ type, ruleSchema }), {
      where: { unit_rule_type: type },
      returning: true,
    });
    const isUpdated = data && data[0];

    return { isUpdated };
  }

  /**
   * Delete by type.
   * @param {number} type Rule type.
   * @returns {Promise<number}
   */
  async deleteByRuleType(type) {
    const res = await this.model.destroy({
      where: { unit_rule_type: type },
    });

    const isDeleted = res && res[0];
    return { isDeleted };
  }

  /**
   * Prepare entity.
   * @private
   * @param {object} item Item.
   * @returns {UnitRulesEntity}
   */
  prepareEntity(item) {
    if (typeof item !== 'object' || item === null) {
      return null;
    }

    return new UnitRulesEntity({
      type: item.unit_rule_type,
      ruleSchema: item.rule_schema,
    });
  }

  /**
   * Prepare for model.
   * @private
   * @param {UnitRulesEntity} item Unit rules entity.
   * @returns {object} User inbox model record.
   */
  prepareForModel(item) {
    return {
      unit_rule_type: item.type,
      rule_schema: item.ruleSchema,
    };
  }
}

module.exports = UnitRulesModel;
