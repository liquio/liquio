const Sequelize = require('sequelize');
const Model = require('./model');

class UnitRulesModel extends Model {
  constructor() {
    if (!UnitRulesModel.singleton) {
      super();

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
          updatedAt: 'updated_at'
        }
      );

      UnitRulesModel.singleton = this;
    }

    return UnitRulesModel.singleton;
  }

  /**
   * Get all rules by type.
   * @param {string} ruleType Unit rule type. 
   */
  async getAllByType(ruleType) {
    const whereClause = { unit_rule_type: ruleType };
    const unitRulesRaw = await this.model.findAll({ where: whereClause });
    const unitRules = unitRulesRaw[0];
    return unitRules && unitRules.rule_schema && unitRules.rule_schema.list || [];
  }
}

module.exports = UnitRulesModel;
