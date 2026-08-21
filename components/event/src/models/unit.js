const Sequelize = require('sequelize');

const Model = require('./model');
const UnitEntity = require('../entities/unit');
const { SequelizeDbError } = require('../lib/errors');

/**
 * Unit model.
 * @typedef {import('../entities/unit')} UnitEntity Unit entity.
 */
class UnitModel extends Model {
  constructor() {
    if (!UnitModel.singleton) {
      super();

      this.model = this.db.define(
        'unit',
        {
          id: {
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
            type: Sequelize.INTEGER,
          },
          parent_id: Sequelize.INTEGER,
          based_on: Sequelize.ARRAY(Sequelize.INTEGER),
          name: Sequelize.STRING,
          description: Sequelize.STRING,
          members: Sequelize.ARRAY(Sequelize.STRING),
          heads: Sequelize.ARRAY(Sequelize.STRING),
          data: Sequelize.JSON,
          menu_config: Sequelize.JSON,
          allow_tokens: Sequelize.ARRAY(Sequelize.STRING),
          heads_ipn: Sequelize.ARRAY(Sequelize.STRING),
          members_ipn: Sequelize.ARRAY(Sequelize.STRING),
          requested_members: Sequelize.ARRAY(Sequelize.JSONB),
        },
        {
          tableName: 'units',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      UnitModel.singleton = this;
    }

    return UnitModel.singleton;
  }

  /**
   * Get all.
   * @returns {Promise<UnitEntity[]>} Unit entities list promise.
   */
  async getAll() {
    // Get units RAW data from DB.
    const unitsRaw = await this.model.findAll();

    // Define and return unit entities.
    const units = unitsRaw.map(this.prepareEntity);
    return units;
  }

  /**
   * Find by ID.
   * @param {number} id Unit ID.
   * @returns {Promise<UnitEntity>} Unit entity promise.
   */
  async findById(id) {
    // Get unit RAW data from DB.
    const unitRaw = await this.model.findByPk(id);

    // Define and return unit entity.
    const unit = this.prepareEntity(unitRaw);
    return unit;
  }

  /**
   * Create unit.
   * @param {object} unitData Unit data.
   * @returns {Promise<UnitEntity>}
   */
  async create(unitData) {
    // Create unit.
    const data = await this.model.create({
      id: unitData.id,
      parent_id: unitData.parentId,
      based_on: unitData.basedOn || [],
      name: unitData.name,
      description: unitData.description,
      members: unitData.members || [],
      heads: unitData.heads || [],
      data: unitData.data || {},
      menu_config: unitData.menuConfig || {},
      allow_tokens: unitData.allowTokens || [],
      heads_ipn: unitData.headsIpn || [],
      members_ipn: unitData.membersIpn || [],
    });

    // Fix last unit ID if need it.
    await this.fixLastUnitIdIfNeedIt();

    // Add allow token equals unit ID if need it.
    if (unitData.allowTokenEqualsId) {
      const unitId = data.id;
      const updatedUnit = await this.addAllowToken(unitId, unitId);
      return updatedUnit;
    }

    // Return created unit.
    return this.prepareEntity(data);
  }

  /**
   * Update unit.
   * @param {object} unitData Unit data.
   * @returns {Promise<UnitEntity>}
   */
  async update(unitData) {
    // Prepare unitDataObject
    const unitDataObject = {
      id: unitData.id,
      parent_id: unitData.parentId,
      based_on: unitData.basedOn,
      name: unitData.name,
      description: unitData.description,
      data: unitData.data,
      menu_config: unitData.menuConfig,
      allow_tokens: unitData.isAllowTokensMustBeAppended
        ? Sequelize.fn('array_append', Sequelize.col('allow_tokens'), `${unitData.allowTokens}`)
        : unitData.allowTokens,
    };
    if (unitData.heads) {
      unitDataObject.heads = unitData.heads;
    }
    if (unitData.members) {
      unitDataObject.members = unitData.members;
    }
    if (unitData.headsIpn) {
      unitDataObject.heads_ipn = unitData.headsIpn;
    }
    if (unitData.membersIpn) {
      unitDataObject.members_ipn = unitData.membersIpn;
    }

    // Filter unitDataEntity from undefined fields.
    const filteredUnitDataObject = Object.keys(unitDataObject)
      .filter((k) => unitDataObject[k] !== undefined)
      .reduce((ac, key) => {
        ac[key] = unitDataObject[key];
        return ac;
      }, {});

    // Create unit.
    let updateResult;
    try {
      updateResult = await this.model.update(filteredUnitDataObject, { where: { id: unitDataObject.id }, returning: true });
    } catch (error) {
      throw new SequelizeDbError(error);
    }

    const [, unitsRaw] = updateResult;

    // Check.
    if (!unitsRaw || unitsRaw.length !== 1) {
      return null;
    }

    // Define and return first updated row entity.
    const [unitRaw] = unitsRaw;
    return this.prepareEntity(unitRaw);
  }

  async updateMembers(unitId, members) {
    const [, updatedUnit] = await this.model.update({ members }, { where: { id: unitId }, returning: true });

    if (updatedUnit.length === 1) {
      return this.prepareEntity(updatedUnit[0]);
    }
  }

  /**
   * Get users from units.
   * @param {number[]} unitIds Unit IDs list.
   * @returns {Promise<{heads: string, members: string, all: string}[]>} User IDs as objects list promise.
   */
  async getUsersFromUnits(unitIds) {
    // Define units.
    const unitsRaw = await this.model.findAll({
      where: { id: unitIds },
      attributes: ['id', 'heads', 'members'],
    });

    // Define users from units.
    const { heads, members } = unitsRaw.reduce(
      (t, v) => ({ heads: [...new Set([...t.heads, ...v.heads])], members: [...new Set([...t.members, ...v.members])] }),
      { heads: [], members: [] },
    );
    const all = [...new Set([...heads, ...members])];

    // Return users list.
    return { heads, members, all };
  }

  /**
   * Add allow token.
   * @param {number} unitId Unit ID.
   * @param {string} allowToken Allow token.
   * @returns {Promise<UnitEntity>} Unit entity promise.
   */
  async addAllowToken(unitId, allowToken) {
    // Update.
    const [, unitsRaw] = await this.model.update(
      { allow_tokens: Sequelize.fn('array_append', Sequelize.col('allow_tokens'), `${allowToken}`) },
      { where: { id: unitId }, returning: true },
    );

    // Check.
    if (!unitsRaw || unitsRaw.length !== 1) {
      return null;
    }

    // Define and return first updated row entity.
    const [unitRaw] = unitsRaw;
    const unit = this.prepareEntity(unitRaw);
    return unit;
  }

  /**
   * Add member.
   * @param {number} unitId Unit ID.
   * @param {string} userId User ID.
   * @returns {Promise<UnitEntity>} Unit entity promise.
   */
  async addMember(unitId, userId) {
    // Update.
    const [, unitsRaw] = await this.model.update(
      { members: Sequelize.fn('array_append', Sequelize.col('members'), userId) },
      { where: { id: unitId }, returning: true },
    );

    // Check.
    if (!unitsRaw || unitsRaw.length !== 1) {
      return null;
    }

    // Define and return first updated row entity.
    const [unitRaw] = unitsRaw;
    const unit = this.prepareEntity(unitRaw);
    return unit;
  }

  /**
   * Add head.
   * @param {number} unitId Unit ID.
   * @param {string} userId User ID.
   * @returns {Promise<UnitEntity>} Unit entity promise.
   */
  async addHead(unitId, userId) {
    // Update.
    const [, unitsRaw] = await this.model.update(
      { heads: Sequelize.fn('array_append', Sequelize.col('heads'), userId) },
      { where: { id: unitId }, returning: true },
    );

    // Check.
    if (!unitsRaw || unitsRaw.length !== 1) {
      return null;
    }

    // Define and return first updated row entity.
    const [unitRaw] = unitsRaw;
    const unit = this.prepareEntity(unitRaw);
    return unit;
  }

  /**
   * Add requested member.
   * @param {number} unitId Unit ID.
   * @param {{ipn: string, firstName: string, middleName: string, lastName: string, wrongUserInfo: boolean}} requestedMember Requested member.
   * @returns {Promise<UnitEntity>} Unit entity promise.
   */
  async addRequestedMember(unitId, requestedMember) {
    // Update.
    const [, unitsRaw] = await this.model.update(
      { requested_members: Sequelize.fn('array_append', Sequelize.col('requested_members'), JSON.stringify(requestedMember)) },
      { where: { id: unitId }, returning: true },
    );

    // Check.
    if (!unitsRaw || unitsRaw.length !== 1) {
      log.save('unit-remove-requested-member|error', { unitId, requestedMember });
      return null;
    }

    // Define and return first updated row entity.
    const [unitRaw] = unitsRaw;
    const unit = this.prepareEntity(unitRaw);

    log.save('unit-remove-requested-member', { unitId, requestedMember });

    return unit;
  }

  /**
   * Add headIpn.
   * @param {number} unitId Unit ID.
   * @param {string} ipn Ipn.
   * @returns {Promise<UnitEntity>} Unit entity promise.
   */
  async addHeadIpn(unitId, ipn) {
    // Update.
    const [, unitsRaw] = await this.model.update(
      { heads_ipn: Sequelize.fn('array_append', Sequelize.col('heads_ipn'), ipn) },
      { where: { id: unitId }, returning: true },
    );

    // Check.
    if (!unitsRaw || unitsRaw.length !== 1) {
      return null;
    }

    // Define and return first updated row entity.
    const [unitRaw] = unitsRaw;
    const unit = this.prepareEntity(unitRaw);
    return unit;
  }

  /**
   * Add memberIpn.
   * @param {number} unitId Unit ID.
   * @param {string} ipn Ipn.
   * @returns {Promise<UnitEntity>} Unit entity promise.
   */
  async addMemberIpn(unitId, ipn) {
    // Update.
    const [, unitsRaw] = await this.model.update(
      { members_ipn: Sequelize.fn('array_append', Sequelize.col('members_ipn'), ipn) },
      { where: { id: unitId }, returning: true },
    );

    // Check.
    if (!unitsRaw || unitsRaw.length !== 1) {
      return null;
    }

    // Define and return first updated row entity.
    const [unitRaw] = unitsRaw;
    const unit = this.prepareEntity(unitRaw);
    return unit;
  }

  /**
   * Add memberIpn list.
   * @param {number} unitId Unit ID.
   * @param {string} ipnList Ipn list.
   * @returns {Promise<UnitEntity>} Unit entity promise.
   */
  async addMemberIpnList(unitId, ipnList) {
    // Update.
    const [unitsRaw] = await this.db.query(
      `
      UPDATE units
      SET updated_at = now(),
          members_ipn = members_ipn || ARRAY[:ipnList]::CHARACTER VARYING[]
      WHERE id = :unitId
      RETURNING *;    
    `,
      {
        replacements: {
          unitId: unitId,
          ipnList: ipnList,
        },
      },
    );

    // Check.
    if (!unitsRaw || unitsRaw.length !== 1) {
      return null;
    }

    // Define and return first updated row entity.
    const [unitRaw] = unitsRaw;
    const unit = this.prepareEntity(unitRaw);
    return unit;
  }

  /**
   * Remove member.
   * @param {number} unitId Unit ID.
   * @param {string} userId User ID.
   * @returns {Promise<UnitEntity>} Unit entity promise.
   */
  async removeMember(unitId, userId) {
    // Update.
    const [, unitsRaw] = await this.model.update(
      { members: Sequelize.fn('array_remove', Sequelize.col('members'), userId) },
      { where: { id: unitId }, returning: true },
    );

    // Check.
    if (!unitsRaw || unitsRaw.length !== 1) {
      return null;
    }

    // Define and return first updated row entity.
    const [unitRaw] = unitsRaw;
    const unit = this.prepareEntity(unitRaw);
    return unit;
  }

  /**
   * Remove member list.
   * @param {number} unitId Unit ID.
   * @param {Array<string>} userIdList User ID list.
   * @returns {Promise<UnitEntity>} Unit entity promise.
   */
  async removeMemberList(unitId, userIdList) {
    // Update.
    const [unitsRaw] = await this.db.query(
      `
      UPDATE units
      SET updated_at = now(),
          members = ARRAY(SELECT unnest(members) EXCEPT SELECT unnest(ARRAY[:userIdList]::CHARACTER VARYING[]))
      WHERE id = :unitId
      RETURNING *;    
    `,
      {
        replacements: {
          unitId: unitId,
          userIdList: userIdList,
        },
      },
    );

    // Check.
    if (!unitsRaw || unitsRaw.length !== 1) {
      return null;
    }

    // Define and return first updated row entity.
    const [unitRaw] = unitsRaw;
    const unit = this.prepareEntity(unitRaw);
    return unit;
  }

  /**
   * Remove head.
   * @param {number} unitId Unit ID.
   * @param {string} userId User ID.
   * @returns {Promise<UnitEntity>} Unit entity promise.
   */
  async removeHead(unitId, userId) {
    // Update.
    const [, unitsRaw] = await this.model.update(
      { heads: Sequelize.fn('array_remove', Sequelize.col('heads'), userId) },
      { where: { id: unitId }, returning: true },
    );

    // Check.
    if (!unitsRaw || unitsRaw.length !== 1) {
      return null;
    }

    // Define and return first updated row entity.
    const [unitRaw] = unitsRaw;
    const unit = this.prepareEntity(unitRaw);
    return unit;
  }

  /**
   * Remove head list.
   * @param {number} unitId Unit ID.
   * @param {Array<string>} userIdList User ID list.
   * @returns {Promise<UnitEntity>} Unit entity promise.
   */
  async removeHeadList(unitId, userIdList) {
    // Update.
    const [unitsRaw] = await this.db.query(
      `
      UPDATE units
      SET updated_at = now(),
          heads = ARRAY(SELECT unnest(heads) EXCEPT SELECT unnest(ARRAY[:userIdList]::CHARACTER VARYING[]))
      WHERE id = :unitId
      RETURNING *;    
    `,
      {
        replacements: {
          unitId: unitId,
          userIdList: userIdList,
        },
      },
    );

    // Check.
    if (!unitsRaw || unitsRaw.length !== 1) {
      return null;
    }

    // Define and return first updated row entity.
    const [unitRaw] = unitsRaw;
    const unit = this.prepareEntity(unitRaw);
    return unit;
  }

  /**
   * Remove member IPN.
   * @param {number} unitId Unit ID.
   * @param {string} ipn User IPN.
   * @returns {Promise<UnitEntity>} Unit entity promise.
   */
  async removeMemberIpn(unitId, ipn) {
    // Update.
    const [, unitsRaw] = await this.model.update(
      { members_ipn: Sequelize.fn('array_remove', Sequelize.col('members_ipn'), ipn) },
      { where: { id: unitId }, returning: true },
    );

    // Check.
    if (!unitsRaw || unitsRaw.length !== 1) {
      return null;
    }

    // Define and return first updated row entity.
    const [unitRaw] = unitsRaw;
    const unit = this.prepareEntity(unitRaw);
    return unit;
  }

  /**
   * Remove member IPN list.
   * @param {number} unitId Unit ID.
   * @param {Array<string>} ipnList User IPN list.
   * @returns {Promise<UnitEntity>} Unit entity promise.
   */
  async removeMemberIpnList(unitId, ipnList) {
    // Update.
    const [unitsRaw] = await this.db.query(
      `
      UPDATE units
      SET updated_at = now(),
          members_ipn = ARRAY(SELECT unnest(members_ipn) EXCEPT SELECT unnest(ARRAY[:ipnList]::CHARACTER VARYING[]))
      WHERE id = :unitId
      RETURNING *;    
    `,
      {
        replacements: {
          unitId: unitId,
          ipnList: ipnList,
        },
      },
    );

    // Check.
    if (!unitsRaw || unitsRaw.length !== 1) {
      return null;
    }

    // Define and return first updated row entity.
    const [unitRaw] = unitsRaw;
    const unit = this.prepareEntity(unitRaw);
    return unit;
  }

  /**
   * Remove head IPN.
   * @param {number} unitId Unit ID.
   * @param {string} ipn User IPN.
   * @returns {Promise<UnitEntity>} Unit entity promise.
   */
  async removeHeadIpn(unitId, ipn) {
    // Update.
    const [, unitsRaw] = await this.model.update(
      { heads_ipn: Sequelize.fn('array_remove', Sequelize.col('heads_ipn'), ipn) },
      { where: { id: unitId }, returning: true },
    );

    // Check.
    if (!unitsRaw || unitsRaw.length !== 1) {
      return null;
    }

    // Define and return first updated row entity.
    const [unitRaw] = unitsRaw;
    const unit = this.prepareEntity(unitRaw);
    return unit;
  }

  /**
   * Remove head IPN list.
   * @param {number} unitId Unit ID.
   * @param {Array<string>} ipnList User IPN list.
   * @returns {Promise<UnitEntity>} Unit entity promise.
   */
  async removeHeadIpnList(unitId, ipnList) {
    // Update.
    const [unitsRaw] = await this.db.query(
      `
      UPDATE units
      SET updated_at = now(),
          heads_ipn = ARRAY(SELECT unnest(heads_ipn) EXCEPT SELECT unnest(ARRAY[:ipnList]::CHARACTER VARYING[]))
      WHERE id = :unitId
      RETURNING *;    
    `,
      {
        replacements: {
          unitId: unitId,
          ipnList: ipnList,
        },
      },
    );

    // Check.
    if (!unitsRaw || unitsRaw.length !== 1) {
      return null;
    }

    // Define and return first updated row entity.
    const [unitRaw] = unitsRaw;
    const unit = this.prepareEntity(unitRaw);
    return unit;
  }

  /**
   * Fix last unit ID if need it.
   */
  async fixLastUnitIdIfNeedIt() {
    // Define current sequence ID and last unit ID.
    const curvalRaw = await this.db.query('select last_value from units_id_seq;', {
      type: this.db.QueryTypes.SELECT,
    });
    const [{ last_value }] = curvalRaw;
    const currentUnitId = parseInt(last_value);
    const maxUnitId = await this.model.max('id');
    log.save('fix-last-unit-id-if-need-it|check', { currentUnitId, maxUnitId });

    // Check and fix.
    if (maxUnitId > currentUnitId) {
      const setRawResponse = await this.db.query('select setval(\'units_id_seq\', :max_unit_id);', {
        raw: true,
        replacements: { max_unit_id: maxUnitId },
      });
      log.save('fix-last-unit-id-if-need-it|set', { currentUnitId, maxUnitId, setRawResponse });
    }
  }

  /**
   * Prepare entity.
   * @param {object} unitRaw RAW unit from DB.
   * @returns {UnitEntity} Unit entity.
   */
  prepareEntity(unitRaw) {
    return new UnitEntity({
      id: unitRaw.id,
      parentId: unitRaw.parent_id,
      basedOn: unitRaw.based_on,
      name: unitRaw.name,
      description: unitRaw.description,
      members: unitRaw.members,
      heads: unitRaw.heads,
      data: unitRaw.data,
      menuConfig: unitRaw.menu_config,
      allowTokens: unitRaw.allow_tokens,
      headsIpn: unitRaw.heads_ipn,
      membersIpn: unitRaw.members_ipn,
    });
  }
}

module.exports = UnitModel;
