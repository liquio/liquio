const Sequelize = require('sequelize');
const Model = require('./model');
const UnitEntity = require('../entities/unit');

class UnitModel extends Model {
  constructor(dbInstance) {
    if (!UnitModel.singleton) {
      super(dbInstance);

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

      this.model.prototype.prepareEntity = this.prepareEntity;
      this.model.paginate = this.paginate;

      UnitModel.singleton = this;
    }

    return UnitModel.singleton;
  }

  /**
   * Find by ID.
   * @param {number} id
   * @returns {Promise<UnitEntity>} Unit entity promise.
   */
  async findById(id) {
    const unit = await this.model.findByPk(id);

    return this.prepareEntity(unit);
  }

  /**
   * Find unit by name.
   * @param {string} name
   * @returns {Promise<UnitEntity>}
   */
  async findByName(name) {
    const unit = await this.model.findOne({ where: { name: name } });

    return this.prepareEntity(unit);
  }

  /**
   * Get all.
   * @returns {Promise<UnitEntity[]>} Unit entities list promise.
   */
  async getAll({ filters = {} } = {}) {
    let sequelizeOptions = {
      where: {},
      order: [['created_at', 'desc']],
    };

    if (filters['heads'] || filters['members']) {
      sequelizeOptions.where[Sequelize.Op.or] = [];
    }

    if (filters['heads']) {
      sequelizeOptions.where[Sequelize.Op.or].push({
        heads: { [Sequelize.Op.overlap]: filters['heads'] },
      });
    }
    if (filters['members']) {
      sequelizeOptions.where[Sequelize.Op.or].push({
        members: { [Sequelize.Op.overlap]: filters['members'] },
      });
    }
    if (filters['ids_in'] || filters['ids_not_in']) {
      sequelizeOptions.where[Sequelize.Op.and] = [];
    }
    if (filters.ids_in) {
      sequelizeOptions.where[Sequelize.Op.and].push({
        id: { [Sequelize.Op.in]: filters['ids_in'] },
      });
    }
    if (filters.ids_not_in) {
      sequelizeOptions.where[Sequelize.Op.and].push({
        id: { [Sequelize.Op.notIn]: filters['ids_not_in'] },
      });
    }

    const units = await this.model.findAll(sequelizeOptions);

    const unitEntities = units.map((item) => {
      return this.prepareEntity(item);
    });

    return unitEntities;
  }

  /**
   * Get by IDs.
   * @param {number[]} ids IDs.
   * @returns {Promise<UnitEntity[]>} Unit entities list promise.
   */
  async getByIds(ids) {
    const units = await this.model.findAll({ where: { id: ids } });

    const unitEntities = units.map((item) => {
      return this.prepareEntity(item);
    });

    return unitEntities;
  }

  /**
   * Get all with pagination.
   * @returns {Promise<UnitEntity[]>} Unit entities list promise.
   */
  async getAllWithPagination({ currentPage, perPage, filters, sort }) {
    let sequelizeOptions = {
      currentPage,
      perPage,
      filters: {},
      sort: [],
    };
    if (typeof filters.id !== 'undefined' || typeof filters.ids_in !== 'undefined' || typeof filters.ids_not_in !== 'undefined') {
      sequelizeOptions.filters['id'] = {
        [Sequelize.Op.and]: [],
      };
    }

    if (typeof filters.id !== 'undefined') {
      sequelizeOptions.filters['id'][Sequelize.Op.and].push({
        [Sequelize.Op.eq]: filters.id,
      });
    }

    if (typeof filters.name !== 'undefined') {
      sequelizeOptions.filters['name'] = {
        [Sequelize.Op.iLike]: `%${filters.name}%`,
      };
    }

    if (typeof filters.based_on !== 'undefined') {
      sequelizeOptions.filters['based_on'] = { [Sequelize.Op.contains]: [filters.based_on] };
    }

    if (typeof filters.head !== 'undefined') {
      sequelizeOptions.filters['heads'] = { [Sequelize.Op.overlap]: [filters.head] };
    }

    if (typeof filters.ids_in !== 'undefined') {
      sequelizeOptions.filters['id'][Sequelize.Op.and].push({
        [Sequelize.Op.in]: filters.ids_in,
      });
    }
    if (typeof filters.ids_not_in !== 'undefined') {
      sequelizeOptions.filters['id'][Sequelize.Op.and].push({
        [Sequelize.Op.notIn]: filters.ids_not_in,
      });
    }

    sort = this.prepareSort(sort);
    if (sort.length > 0) {
      sequelizeOptions.sort = sort;
    }

    const unitEntities = await this.model.paginate(sequelizeOptions);

    unitEntities.data = unitEntities.data.map((item) => this.prepareEntity(item));

    return unitEntities;
  }

  /**
   * Create unit.
   * @param {UnitEntity} unitEntity Unit entity.
   * @param {any} transaction Transaction.
   * @returns {Promise<UnitEntity>} Unit entity promise.
   */
  async create(unitEntity, transaction) {
    if (!(unitEntity instanceof UnitEntity)) {
      throw new Error('Must be instance of UnitEntity');
    }

    // Fix last unit ID if need it.
    await this.fixLastUnitIdIfNeedIt();

    const [data] = await this.model.upsert(this.prepareForModel(unitEntity), {
      returning: true,
      transaction,
    });

    // Fix last unit ID if need it.
    await this.fixLastUnitIdIfNeedIt();

    return this.prepareEntity(data);
  }

  /**
   * Update unit.
   * @param {UnitEntity} unitEntity Unit entity.
   * @returns {Promise<UnitEntity>} Unit entity promise.
   */
  async update(unitEntity) {
    const data = await this.model.update(this.prepareForModel(unitEntity), {
      where: { id: unitEntity.id },
      returning: true,
    });

    return this.prepareEntity(data);
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
      (t, v) => ({
        heads: [...new Set([...t.heads, ...v.heads])],
        members: [...new Set([...t.members, ...v.members])],
      }),
      { heads: [], members: [] },
    );
    const all = [...new Set([...heads, ...members])];

    // Return users list.
    return { heads, members, all };
  }

  /**
   * Delete by ID.
   * @param {number} id ID.
   * @returns {Promise<number}
   */
  async deleteById(id) {
    return await this.model.destroy({
      where: { id },
    });
  }

  /**
   * Add member.
   * @param {number} unitId Unit ID.
   * @param {string} userId User ID.
   * @returns {Promise<UnitEntity>} Unit entity promise.
   */
  async addMember(unitId, userId) {
    // Remove duplicates, if they exist.
    await this.model.update({ members: Sequelize.fn('array_remove', Sequelize.col('members'), userId) }, { where: { id: unitId } });
    // Add new member.
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
   * Update members.
   * @param {number} unitId Unit ID.
   * @param {string[]} members Members.
   * @returns {Promise<UnitEntity>} Unit entity promise.
   */
  async updateMembers(unitId, members) {
    const [, updatedUnit] = await this.model.update({ members }, { where: { id: unitId }, returning: true });

    if (updatedUnit.length === 1) {
      return this.prepareEntity(updatedUnit[0]);
    }
  }

  /**
   * Update heads.
   * @param {number} unitId Unit ID.
   * @param {string[]} heads Heads.
   * @returns {Promise<UnitEntity>} Unit entity promise.
   */
  async updateHeads(unitId, heads) {
    const [, updatedUnit] = await this.model.update({ heads }, { where: { id: unitId }, returning: true });

    if (updatedUnit.length === 1) {
      return this.prepareEntity(updatedUnit[0]);
    }
  }

  /**
   * Add head.
   * @param {number} unitId Unit ID.
   * @param {string} userId User ID.
   * @returns {Promise<UnitEntity>} Unit entity promise.
   */
  async addHead(unitId, userId) {
    // Remove duplicates, if they exist.
    await this.model.update({ heads: Sequelize.fn('array_remove', Sequelize.col('heads'), userId) }, { where: { id: unitId } });
    // Add new head.
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
   * Add headIpn.
   * @param {number} unitId Unit ID.
   * @param {string} ipn Ipn.
   * @returns {Promise<UnitEntity>} Unit entity promise.
   */
  async addHeadIpn(unitId, ipn) {
    // Remove duplicates, if they exist.
    await this.model.update({ heads_ipn: Sequelize.fn('array_remove', Sequelize.col('heads_ipn'), ipn) }, { where: { id: unitId } });
    // Add new head.
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
    // Remove duplicates, if they exist.
    await this.model.update({ members_ipn: Sequelize.fn('array_remove', Sequelize.col('members_ipn'), ipn) }, { where: { id: unitId } });
    // Add new member.
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
   * Remove head ipn.
   * @param {number} unitId Unit ID.
   * @param {string} ipn Ipn.
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
   * Remove member ipn.
   * @param {number} unitId Unit ID.
   * @param {string} ipn Ipn.
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
   * Add requested member.
   * @param {number} unitId Unit ID.
   * @param {{ipn: string, firstName: string, middleName: string, lastName: string, wrongUserInfo: boolean}} requestedMember Requested member.
   * @returns {Promise<UnitEntity>} Unit entity promise.
   */
  async addRequestedMember(unitId, requestedMember) {
    // Update.
    const [, unitsRaw] = await this.model.update(
      {
        requested_members: Sequelize.fn('array_append', Sequelize.col('requested_members'), JSON.stringify(requestedMember)),
      },
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
   * Remove requested member.
   * @param {number} unitId Unit ID.
   * @param {string} requestedMemberIpn Requested member IPN.
   * @returns {Promise<UnitEntity>} Unit entity promise.
   */
  async removeRequestedMember(unitId, requestedMemberIpn) {
    // Get unit.
    const unit = await this.findById(unitId);
    const { requestedMembers } = unit;

    // Remove requested member.
    const requestedMembersToUpdate = requestedMembers.filter((v) => v.ipn !== requestedMemberIpn);
    const [, unitsRaw] = await this.model.update({ requested_members: requestedMembersToUpdate }, { where: { id: unitId }, returning: true });

    // Define and return first updated row entity.
    const [updatedUnitRaw] = unitsRaw;
    const updatedUnit = this.prepareEntity(updatedUnitRaw);
    log.save('unit-remove-requested-member', { unitId, requestedMemberIpn });
    return updatedUnit;
  }

  /**
   * Get users from units.
   * @returns {Promise<{object[]>} rawRows. Example : [ { "key": "unit.1000001.head", "userIds": ["userId1", "userId2"] }, { "key": "unit.1000001.member", "userIds": ["userId1", "userId3"] }]
   */
  async getAccessedUsersToUnits() {
    const rows = await this.db.query(
      `
    SELECT t.unit_id,
      t.access,
      CONCAT(t.unit_id, '.', t.access) "access_index",
      ARRAY_AGG(t.user_id) "user_ids"
    FROM ((
      SELECT u.id "unit_id",
        'head' "access",
        UNNEST(u.heads) "user_id"
      FROM units u
    ) UNION ALL (
      SELECT u.id "unit_id",
        'member' "access",
        UNNEST(u.members) "user_id"
      FROM units u 
    )) t
    GROUP BY t.unit_id, t.access
    ORDER BY unit_id ASC;
    `,
      {
        type: this.db.QueryTypes.SELECT,
      },
    );

    return rows;
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {UnitEntity}
   */
  prepareEntity(item) {
    if (typeof item !== 'object' || item === null) {
      return null;
    }

    return new UnitEntity({
      id: item.id,
      parentId: item.parent_id,
      parent: item.parent,
      basedOn: item.based_on,
      name: item.name,
      description: item.description,
      members: item.members,
      heads: item.heads,
      data: item.data,
      menuConfig: item.menu_config,
      allowTokens: item.allow_tokens,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      headsIpn: item.heads_ipn,
      membersIpn: item.members_ipn,
      requestedMembers: item.requested_members,
    });
  }

  /**
   * Prepare for model.
   * @param {UnitEntity} item Item.
   * @returns {object}
   */
  prepareForModel(item) {
    return {
      id: item.id,
      parent_id: item.parentId,
      parent: item.parent,
      based_on: item.basedOn,
      name: item.name,
      description: item.description,
      members: item.members,
      heads: item.heads,
      data: item.data,
      menu_config: item.menuConfig,
      allow_tokens: item.allowTokens,
      heads_ipn: item.headsIpn,
      members_ipn: item.membersIpn,
    };
  }
}

module.exports = UnitModel;
