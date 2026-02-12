import { Sequelize, DataTypes } from 'sequelize';
import Model from './model';
import UnitEntity from '../entities/unit';
import RedisClient from '../lib/redis_client';

const DEFAULT_CACHE_TTL = 600;

/**
 * Unit model.
 */
class UnitModel extends Model {
  model: any;
  static singleton: UnitModel;

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
            type: DataTypes.INTEGER,
          },
          parent_id: DataTypes.INTEGER,
          based_on: DataTypes.ARRAY(DataTypes.INTEGER),
          name: DataTypes.STRING,
          description: DataTypes.STRING,
          members: DataTypes.ARRAY(DataTypes.STRING),
          heads: DataTypes.ARRAY(DataTypes.STRING),
          data: DataTypes.JSON,
          menu_config: DataTypes.JSON,
          allow_tokens: DataTypes.ARRAY(DataTypes.STRING),
          heads_ipn: DataTypes.ARRAY(DataTypes.STRING),
          members_ipn: DataTypes.ARRAY(DataTypes.STRING),
          requested_members: DataTypes.ARRAY(DataTypes.JSON),
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
   * @returns Promise of unit entities.
   */
  async getAll(): Promise<UnitEntity[]> {
    const { data: unitsRaw } = await RedisClient.getOrSetWithTimestamp(
      RedisClient.createKey('unit', 'getAll'),
      () => this.model.max('updated_at'),
      () => this.model.findAll(),
      DEFAULT_CACHE_TTL,
    );

    return (unitsRaw as any[]).map((u: any) => this.prepareEntity(u));
  }

  /**
   * Get by IDs.
   * @param ids Unit IDs list.
   * @returns List of unit entities.
   */
  async getByIds(ids: number[]): Promise<UnitEntity[]> {
    const unitsRaw = await this.model.findAll({ where: { id: ids } });

    return unitsRaw.map((u: any) => this.prepareEntity(u));
  }

  /**
   * Find by ID.
   * @param id Unit ID.
   * @returns Unit entity.
   */
  async findById(id: number): Promise<UnitEntity | undefined> {
    const unitRaw = await this.model.findByPk(id);

    if (!unitRaw) {
      return undefined;
    }

    return this.prepareEntity(unitRaw);
  }

  /**
   * Add member.
   * @param unitId Unit ID.
   * @param userId User ID.
   * @returns Unit entity.
   */
  async addMember(unitId: number, userId: string): Promise<UnitEntity | null> {
    // Update.
    const [, unitsRaw] = await this.model.update(
      {
        members: Sequelize.fn('array_append', Sequelize.col('members'), userId),
      },
      { where: { id: unitId }, returning: true },
    );

    // Check.
    if (!unitsRaw || unitsRaw.length !== 1) {
      global.log.save('unit-add-member|error', { unitId, userId });
      return null;
    }

    // Define and return first updated row entity.
    const [unitRaw] = unitsRaw;
    const unit = this.prepareEntity(unitRaw);

    global.log.save('unit-add-member', { unitId, userId });

    return unit;
  }

  /**
   * Add head.
   * @param unitId Unit ID.
   * @param userId User ID.
   * @returns Unit entity.
   */
  async addHead(unitId: number, userId: string): Promise<UnitEntity | null> {
    // Update.
    const [, unitsRaw] = await this.model.update(
      {
        heads: Sequelize.fn('array_append', Sequelize.col('heads'), userId),
      },
      { where: { id: unitId }, returning: true },
    );

    // Check.
    if (!unitsRaw || unitsRaw.length !== 1) {
      global.log.save('unit-add-head|error', { unitId, userId });
      return null;
    }

    // Define and return first updated row entity.
    const [unitRaw] = unitsRaw;
    const unit = this.prepareEntity(unitRaw);

    global.log.save('unit-add-head', { unitId, userId });

    return unit;
  }

  /**
   * Add requested member.
   * @param unitId Unit ID.
   * @param requestedMember Requested member object.
   * @returns Unit entity.
   */
  async addRequestedMember(
    unitId: number,
    requestedMember: {
      ipn: string;
      firstName: string;
      middleName: string;
      lastName: string;
      wrongUserInfo: boolean;
    },
  ): Promise<UnitEntity | null> {
    // Update.
    const [, unitsRaw] = await this.model.update(
      {
        requested_members: Sequelize.fn(
          'array_append',
          Sequelize.col('requested_members'),
          JSON.stringify(requestedMember),
        ),
      },
      { where: { id: unitId }, returning: true },
    );

    // Check.
    if (!unitsRaw || unitsRaw.length !== 1) {
      global.log.save('unit-remove-requested-member|error', {
        unitId,
        requestedMember,
      });
      return null;
    }

    // Define and return first updated row entity.
    const [unitRaw] = unitsRaw;
    const unit = this.prepareEntity(unitRaw);

    global.log.save('unit-remove-requested-member', { unitId, requestedMember });

    return unit;
  }

  /**
   * Remove requested member.
   * @param unitId Unit ID.
   * @param requestedMemberIpn Requested member IPN.
   * @returns Unit entity.
   */
  async removeRequestedMember(
    unitId: number,
    requestedMemberIpn: string,
  ): Promise<UnitEntity> {
    // Get unit.
    const unit = await this.findById(unitId);
    const { requestedMembers } = unit!;

    // Remove requested member.
    const requestedMembersToUpdate = requestedMembers.filter(
      (v: any) => v.ipn !== requestedMemberIpn,
    );
    const [, unitsRaw] = await this.model.update(
      { requested_members: requestedMembersToUpdate },
      { where: { id: unitId }, returning: true },
    );

    // Define and return first updated row entity.
    const [updatedUnitRaw] = unitsRaw;
    const updatedUnit = this.prepareEntity(updatedUnitRaw);
    global.log.save('unit-remove-requested-member', { unitId, requestedMemberIpn });
    return updatedUnit;
  }

  /**
   * Remove head ipn.
   * @param unitId Unit ID.
   * @param ipn IPN value.
   * @returns Unit entity.
   */
  async removeHeadIpn(unitId: number, ipn: string): Promise<UnitEntity | null> {
    // Update.
    const [, unitsRaw] = await this.model.update(
      {
        heads_ipn: Sequelize.fn('array_remove', Sequelize.col('heads_ipn'), ipn),
      },
      { where: { id: unitId }, returning: true },
    );

    // Check.
    if (!unitsRaw || unitsRaw.length !== 1) {
      global.log.save('unit-remove-head-ipn|error', { unitId, ipn });
      return null;
    }

    // Define and return first updated row entity.
    const [unitRaw] = unitsRaw;
    const unit = this.prepareEntity(unitRaw);

    global.log.save('unit-remove-head-ipn', { unitId, ipn });

    return unit;
  }

  /**
   * Remove member.
   * @param unitId Unit ID.
   * @param userId User ID.
   * @returns Unit entity.
   */
  async removeMember(
    unitId: number,
    userId: string,
  ): Promise<UnitEntity | null> {
    // Update.
    const [, unitsRaw] = await this.model.update(
      {
        members: Sequelize.fn('array_remove', Sequelize.col('members'), userId),
      },
      { where: { id: unitId }, returning: true },
    );

    // Check.
    if (!unitsRaw || unitsRaw.length !== 1) {
      global.log.save('unit-remove-member|error', { unitId, userId });
      return null;
    }

    // Define and return first updated row entity.
    const [unitRaw] = unitsRaw;
    const unit = this.prepareEntity(unitRaw);

    global.log.save('unit-remove-member', { unitId, userId });

    return unit;
  }

  /**
   * Remove member ipn.
   * @param unitId Unit ID.
   * @param ipn IPN value.
   * @returns Unit entity.
   */
  async removeMemberIpn(unitId: number, ipn: string): Promise<UnitEntity | null> {
    // Update.
    const [, unitsRaw] = await this.model.update(
      {
        members_ipn: Sequelize.fn('array_remove', Sequelize.col('members_ipn'), ipn),
      },
      { where: { id: unitId }, returning: true },
    );

    // Check.
    if (!unitsRaw || unitsRaw.length !== 1) {
      global.log.save('unit-remove-member-ipn|error', { unitId, ipn });
      return null;
    }

    // Define and return first updated row entity.
    const [unitRaw] = unitsRaw;
    const unit = this.prepareEntity(unitRaw);

    global.log.save('unit-remove-member-ipn', { unitId, ipn });

    return unit;
  }

  /**
   * Prepare entity from raw database row.
   * @param unitRaw Raw unit from DB.
   * @returns Unit entity.
   */
  prepareEntity(unitRaw: any): UnitEntity {
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

export default UnitModel;
