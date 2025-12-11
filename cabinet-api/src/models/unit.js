const Sequelize = require('sequelize');
const Model = require('./model');
const UnitEntity = require('../entities/unit');
const RedisClient = require('../lib/redis_client');

const DEFAULT_CACHE_TTL = 600;

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
   * @returns {Promise<UnitEntity[]>}
   */
  async getAll() {
    let { data: unitsRaw } = await RedisClient.getOrSetWithTimestamp(
      RedisClient.createKey('unit', 'getAll'),
      () => this.model.max('updated_at'),
      () => this.model.findAll(),
      DEFAULT_CACHE_TTL,
    );

    return unitsRaw.map(this.prepareEntity);
  }

  /**
   * Get by IDs.
   * @param {number[]} ids Unit IDs list.
   * @returns {Promise<UnitEntity[]>} Units promise list.
   */
  async getByIds(ids) {
    const unitsRaw = await this.model.findAll({ where: { id: ids } });

    return unitsRaw.map(this.prepareEntity);
  }

  /**
   * Find by ID.
   * @param {number} id
   * @returns {Promise<UnitEntity>}
   */
  async findById(id) {
    const unitRaw = await this.model.findByPk(id);

    if (!unitRaw) {
      return;
    }

    return this.prepareEntity(unitRaw);
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
      {
        members: Sequelize.fn('array_append', Sequelize.col('members'), userId),
      },
      { where: { id: unitId }, returning: true },
    );

    // Check.
    if (!unitsRaw || unitsRaw.length !== 1) {
      log.save('unit-add-member|error', { unitId, userId });
      return null;
    }

    // Define and return first updated row entity.
    const [unitRaw] = unitsRaw;
    const unit = this.prepareEntity(unitRaw);

    log.save('unit-add-member', { unitId, userId });

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
      log.save('unit-add-head|error', { unitId, userId });
      return null;
    }

    // Define and return first updated row entity.
    const [unitRaw] = unitsRaw;
    const unit = this.prepareEntity(unitRaw);

    log.save('unit-add-head', { unitId, userId });

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
   * Remove head ipn.
   * @param {number} unitId Unit ID.
   * @param {string} ipn Ipn.
   * @returns {Promise<UnitEntity>} Unit entity promise.
   */
  async removeHeadIpn(unitId, ipn) {
    // Update.
    const [, unitsRaw] = await this.model.update(
      {
        heads_ipn: Sequelize.fn('array_remove', Sequelize.col('heads_ipn'), ipn),
      },
      { where: { id: unitId }, returning: true },
    );

    // Check.
    if (!unitsRaw || unitsRaw.length !== 1) {
      log.save('unit-remove-head-ipn|error', { unitId, ipn });
      return null;
    }

    // Define and return first updated row entity.
    const [unitRaw] = unitsRaw;
    const unit = this.prepareEntity(unitRaw);

    log.save('unit-remove-head-ipn', { unitId, ipn });

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
      {
        members: Sequelize.fn('array_remove', Sequelize.col('members'), userId),
      },
      { where: { id: unitId }, returning: true },
    );

    // Check.
    if (!unitsRaw || unitsRaw.length !== 1) {
      log.save('unit-remove-member|error', { unitId, userId });
      return null;
    }

    // Define and return first updated row entity.
    const [unitRaw] = unitsRaw;
    const unit = this.prepareEntity(unitRaw);

    log.save('unit-remove-member', { unitId, userId });

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
      {
        members_ipn: Sequelize.fn('array_remove', Sequelize.col('members_ipn'), ipn),
      },
      { where: { id: unitId }, returning: true },
    );

    // Check.
    if (!unitsRaw || unitsRaw.length !== 1) {
      log.save('unit-remove-member-ipn|error', { unitId, ipn });
      return null;
    }

    // Define and return first updated row entity.
    const [unitRaw] = unitsRaw;
    const unit = this.prepareEntity(unitRaw);

    log.save('unit-remove-member-ipn', { unitId, ipn });

    return unit;
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
      requestedMembers: unitRaw.requested_members,
    });
  }
}

module.exports = UnitModel;
