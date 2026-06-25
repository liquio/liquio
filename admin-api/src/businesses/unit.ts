import _ from 'lodash';

import { Exceptions } from '../exceptions';
import { UnitEntity } from '../entities/unit';
import { AuthService } from '../services/auth';
import { UNIT_ADMIN_UNIT, SECURITY_ADMIN_UNIT, SYSTEM_ADMIN_UNIT, SUPPORT_ADMIN_UNIT, ADMIN_UNITS } from '../constants/unit';

const UNIT_PREVIOUS_DATA_MAP = {
  basedOn: 'previousBasedOn',
  members: 'previousMembers',
  heads: 'previousHeads',
  allowTokens: 'previousAllowTokens',
  membersIpn: 'previousMembersIpn',
  headsIpn: 'previousHeadsIpn',
};

/**
 * Unit business.
 */
export class UnitBusiness {
  private static singleton: UnitBusiness;

  public config: any;
  public authService: AuthService;

  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!UnitBusiness.singleton) {
      this.config = config;
      this.authService = new AuthService(config.auth);
      UnitBusiness.singleton = this;
    }

    // Return singleton.
    return UnitBusiness.singleton;
  }

  /**
   * Create unit.
   * @param {UnitEntity} unitEntity Unit Entity.
   * @param {object} currentUser Current user.
   * @returns {Promise<UnitEntity>}
   */
  async create(unitEntity, currentUser) {
    unitEntity.members = _.uniq(unitEntity.members);
    unitEntity.heads = _.uniq(unitEntity.heads);

    let foundUsersFromAuthService = [];
    foundUsersFromAuthService = await this.authService.getUsersByIdsWithCache(
      [...unitEntity.members, ...unitEntity.heads],
      foundUsersFromAuthService,
    );

    for (const baseUnitId of unitEntity.basedOn) {
      const baseUnit = await global.models.unit.findById(baseUnitId);
      if (!baseUnit) {
        continue;
      }

      let members = baseUnit.members;
      let heads = baseUnit.heads;

      for (const member of unitEntity.members) {
        members.push(member);
      }
      members = _.uniq(members);

      for (const head of unitEntity.heads) {
        heads.push(head);
      }
      heads = _.uniq(heads);

      foundUsersFromAuthService = await this.authService.getUsersByIdsWithCache([...members, ...heads], foundUsersFromAuthService);

      await global.models.unit.updateMembers(baseUnitId, members);
      for (const memberId of members) {
        const member = foundUsersFromAuthService.find((v) => v.userId === memberId);

        // Save to access history.
        const baseUnit = await global.models.unit.findById(baseUnitId);
        await global.models.accessHistory.save({
          currentUser: currentUser,
          operationType: 'added-to-member-unit',
          user: {
            ...member,
            userId: memberId,
          },
          unit: baseUnit,
        });
      }

      await global.models.unit.updateHeads(baseUnitId, heads);
      for (const headId of heads) {
        const head = foundUsersFromAuthService.find((v) => v.userId === headId);

        // Save to access history.
        const baseUnit = await global.models.unit.findById(baseUnitId);
        await global.models.accessHistory.save({
          currentUser: currentUser,
          operationType: 'added-to-head-unit',
          user: {
            ...head,
            userId: headId,
          },
          unit: baseUnit,
        });
      }
    }

    const createdUnit = await global.models.unit.create(unitEntity);

    for (const memberId of unitEntity.members) {
      const member = foundUsersFromAuthService.find((v) => v.userId === memberId);

      // Save to access history.
      await global.models.accessHistory.save({
        currentUser: currentUser,
        operationType: 'added-to-member-unit',
        user: {
          ...member,
          userId: memberId,
        },
        unit: createdUnit,
      });
    }

    for (const ipn of unitEntity.membersIpn) {
      // Save to access history.
      await global.models.accessHistory.save({
        currentUser: currentUser,
        operationType: 'added-to-member-unit',
        user: { ipn },
        unit: createdUnit,
      });
    }

    for (const headId of unitEntity.heads) {
      const head = foundUsersFromAuthService.find((v) => v.userId === headId);

      // Save to access history.
      await global.models.accessHistory.save({
        currentUser: currentUser,
        operationType: 'added-to-head-unit',
        user: {
          ...head,
          userId: headId,
        },
        unit: createdUnit,
      });
    }

    for (const ipn of unitEntity.headsIpn) {
      // Save to access history.
      await global.models.accessHistory.save({
        currentUser: currentUser,
        operationType: 'added-to-head-unit',
        user: { ipn },
        unit: createdUnit,
      });
    }

    return createdUnit;
  }

  /**
   * Update unit.
   * @param {object} unitIds Unit Ids.
   * @param {UnitEntity} unitEntity Unit Entity.
   * @param {object} currentUser Current user.
   * @returns {Promise<{updatedUnit: UnitEntity, newHeads, newMembers, newHeadsIpn, newMembersIpn, removedHeads, removedMembers, removedHeadsIpn, removedMembersIpn}>} Update info.
   */
  async update(unitIds, unitEntity, currentUser) {
    this.checkAccess(unitEntity.id, unitIds);

    unitEntity.heads = _.uniq(unitEntity.heads);
    unitEntity.members = _.uniq(unitEntity.members);
    unitEntity.headsIpn = _.uniq(unitEntity.headsIpn || []);
    unitEntity.membersIpn = _.uniq(unitEntity.membersIpn || []);

    const currentUnit = await global.models.unit.findById(unitEntity.id);
    const newHeads = _.difference(unitEntity.heads, currentUnit.heads);
    const newMembers = _.difference(unitEntity.members, currentUnit.members);
    const newHeadsIpn = _.difference(unitEntity.headsIpn, currentUnit.headsIpn);
    const newMembersIpn = _.difference(unitEntity.membersIpn, currentUnit.membersIpn);
    const removedHeads = _.difference(currentUnit.heads, unitEntity.heads);
    const removedMembers = _.difference(currentUnit.members, unitEntity.members);
    const removedHeadsIpn = _.difference(currentUnit.headsIpn, unitEntity.headsIpn);
    const removedMembersIpn = _.difference(currentUnit.membersIpn, unitEntity.membersIpn);

    let foundUsersFromAuthService = [];
    foundUsersFromAuthService = await this.authService.getUsersByIdsWithCache(
      [...newHeads, ...newMembers, ...removedHeads, ...removedMembers],
      foundUsersFromAuthService,
    );

    for (const baseUnitId of unitEntity.basedOn) {
      const baseUnit = await global.models.unit.findById(baseUnitId);
      if (!baseUnit) {
        continue;
      }

      let members = baseUnit.members;
      let heads = baseUnit.heads;

      for (const member of newMembers) {
        members.push(member);
      }
      members = _.uniq(members);

      for (const head of newHeads) {
        heads.push(head);
      }
      heads = _.uniq(heads);

      foundUsersFromAuthService = await this.authService.getUsersByIdsWithCache([...members, ...heads], foundUsersFromAuthService);

      await global.models.unit.updateMembers(baseUnitId, members);
      for (const memberId of newMembers) {
        const member = foundUsersFromAuthService.find((v) => v.userId === memberId);

        // Save to access history.
        const baseUnit = await global.models.unit.findById(baseUnitId);
        await global.models.accessHistory.save({
          currentUser: currentUser,
          operationType: 'added-to-member-unit',
          user: {
            ...member,
            userId: memberId,
          },
          unit: baseUnit,
        });
      }

      await global.models.unit.updateHeads(baseUnitId, heads);
      for (const headId of newHeads) {
        const head = foundUsersFromAuthService.find((v) => v.userId === headId);

        // Save to access history.
        const baseUnit = await global.models.unit.findById(baseUnitId);
        await global.models.accessHistory.save({
          currentUser: currentUser,
          operationType: 'added-to-head-unit',
          user: {
            ...head,
            userId: headId,
          },
          unit: baseUnit,
        });
      }
    }

    const updatedUnit = await global.models.unit.create(unitEntity);

    for (const memberId of newMembers) {
      const member = foundUsersFromAuthService.find((v) => v.userId === memberId);

      // Save to access history.
      await global.models.accessHistory.save({
        currentUser: currentUser,
        operationType: 'added-to-member-unit',
        user: {
          ...member,
          userId: memberId,
        },
        unit: updatedUnit,
      });
    }

    for (const ipn of newMembersIpn) {
      // Save to access history.
      await global.models.accessHistory.save({
        currentUser: currentUser,
        operationType: 'added-to-member-unit',
        user: { ipn },
        unit: updatedUnit,
      });
    }

    for (const memberId of removedMembers) {
      const member = foundUsersFromAuthService.find((v) => v.userId === memberId);

      // Remove performer user from tasks.
      await global.models.task.removePerformerUserFromTasks(memberId, unitEntity.id);

      // Save to access history.
      await global.models.accessHistory.save({
        currentUser: currentUser,
        operationType: 'deleted-from-member-unit',
        user: {
          ...member,
          userId: memberId,
        },
        unit: updatedUnit,
      });
    }

    for (const ipn of removedMembersIpn) {
      // Save to access history.
      await global.models.accessHistory.save({
        currentUser: currentUser,
        operationType: 'deleted-from-member-unit',
        user: { ipn },
        unit: updatedUnit,
      });
    }

    for (const headId of newHeads) {
      const head = foundUsersFromAuthService.find((v) => v.userId === headId);

      // Save to access history.
      await global.models.accessHistory.save({
        currentUser: currentUser,
        operationType: 'added-to-head-unit',
        user: {
          ...head,
          userId: headId,
        },
        unit: updatedUnit,
      });
    }

    for (const ipn of newHeadsIpn) {
      // Save to access history.
      await global.models.accessHistory.save({
        currentUser: currentUser,
        operationType: 'added-to-head-unit',
        user: { ipn },
        unit: updatedUnit,
      });
    }

    for (const headId of removedHeads) {
      const head = foundUsersFromAuthService.find((v) => v.userId === headId);

      // Remove performer user from tasks.
      await global.models.task.removePerformerUserFromTasks(headId, unitEntity.id);

      // Save to access history.
      await global.models.accessHistory.save({
        currentUser: currentUser,
        operationType: 'deleted-from-head-unit',
        user: {
          ...head,
          userId: headId,
        },
        unit: updatedUnit,
      });
    }

    for (const ipn of removedHeadsIpn) {
      // Save to access history.
      await global.models.accessHistory.save({
        currentUser: currentUser,
        operationType: 'deleted-from-head-unit',
        user: { ipn },
        unit: updatedUnit,
      });
    }

    return {
      updatedUnit,
      newHeads,
      newMembers,
      newHeadsIpn,
      newMembersIpn,
      removedHeads,
      removedMembers,
      removedHeadsIpn,
      removedMembersIpn,
    };
  }

  /**
   * Get units with pagination.
   * @returns {Promise<UnitEntity[]>}
   */
  async getAllWithPagination(params) {
    // Unit admin.
    if (params.unitIds?.some((v) => v === UNIT_ADMIN_UNIT) && !params.unitIds.some((v) => v === SECURITY_ADMIN_UNIT)) {
      params.filters.head = params.userId;
    }
    if (params.filters?.admin_units === true) {
      params.filters.ids_in = ADMIN_UNITS;
      delete params.filters.admin_units;
    }
    if (params.filters?.admin_units === false) {
      params.filters.ids_not_in = ADMIN_UNITS;
      delete params.filters.admin_units;
    }
    return await global.models.unit.getAllWithPagination({
      ...params,
    });
  }

  /**
   * Get units.
   * @returns {Promise<UnitEntity[]>}
   */
  async getAll(params) {
    if (params.filters?.admin_units === true) {
      params.filters.ids_in = ADMIN_UNITS;
      delete params.filters.admin_units;
    }
    if (params.filters?.admin_units === false) {
      params.filters.ids_not_in = ADMIN_UNITS;
      delete params.filters.admin_units;
    }
    return await global.models.unit.getAll(params);
  }

  /**
   * Add heads.
   * @param {object} params Params.
   * @param {object[]} params.unitIds Unit Ids.
   * @param {number} params.id ID.
   * @param {string[]} params.heads Heads.
   * @param {object} params.currentUser Current user.
   * @param {boolean} params.isForce Force.
   * @returns {Promise<{beforeUpdatedUnit: UnitEntity, afterUpdatedUnit: UnitEntity}>}
   */
  async addHeads({ unitIds, id, heads, currentUser, isForce }) {
    if (!isForce) {
      this.checkAccess(id, unitIds);
    }

    const unit = await global.models.unit.findById(id);

    if (!unit) {
      return;
    }

    // Add user to unit heads if this user isn't head yet.
    const existingHeads = unit.heads;
    const headsToAdd = heads.filter((head) => !existingHeads.includes(head));
    if (headsToAdd.length === 0) {
      return { beforeUpdatedUnit: unit, afterUpdatedUnit: unit };
    }

    let lastUpdatedUnit;
    for (const headId of headsToAdd) {
      const head = await this.authService.findByUserId(headId);

      const { basedOn = [] } = unit;
      for (const baseUnitId of basedOn) {
        await global.models.unit.addHead(baseUnitId, headId);

        // Save to access history.
        const baseUnit = await global.models.unit.findById(baseUnitId);
        await global.models.accessHistory.save({
          currentUser: currentUser,
          operationType: 'added-to-head-unit',
          user: {
            ...head,
            userId: headId,
          },
          unit: baseUnit,
        });
      }

      lastUpdatedUnit = await global.models.unit.addHead(id, headId);

      // Save to access history.
      await global.models.accessHistory.save({
        currentUser: currentUser,
        operationType: 'added-to-head-unit',
        user: {
          ...head,
          userId: headId,
        },
        unit: unit,
      });
    }

    return { beforeUpdatedUnit: unit, afterUpdatedUnit: lastUpdatedUnit };
  }

  /**
   * Remove heads.
   * @param {object} params Params.
   * @param {number} params.id ID.
   * @param {string[]} params.heads Heads.
   * @param {object} params.currentUser Current user.
   * @returns {Promise<{beforeUpdatedUnit: UnitEntity, afterUpdatedUnit: UnitEntity}>}
   */
  async removeHeads({ unitIds, id, heads, currentUser }) {
    this.checkAccess(id, unitIds);

    const unit = await global.models.unit.findById(id);

    if (!unit) {
      return;
    }

    // Remove user from unit heads if this user is head.
    const existingsHeads = unit.heads;
    const headsToRemove = heads.filter((head) => existingsHeads.includes(head));
    if (headsToRemove.length === 0) {
      return { beforeUpdatedUnit: unit, afterUpdatedUnit: unit };
    }

    let lastUpdatedUnit;
    for (const headId of headsToRemove) {
      const head = await this.authService.findByUserId(headId);

      lastUpdatedUnit = await global.models.unit.removeHead(id, headId);

      // Remove performer user from tasks.
      await global.models.task.removePerformerUserFromTasks(headId, id);

      //If removed from SUPPORT_ADMIN_UNIT unsubscribe from errors
      if (lastUpdatedUnit.id === SUPPORT_ADMIN_UNIT) {
        const options = {
          where: {},
          attributes: ['id', 'errors_subscribers'],
        };
        const allWorkflowTemplates = await global.models.workflowTemplate.getAll(options);
        const subscribedWorkflowTemplates = allWorkflowTemplates.filter(({ errorsSubscribers }) => errorsSubscribers.some((el) => el.id === headId));

        subscribedWorkflowTemplates.forEach((workflowTemplate) => {
          global.businesses.workflow.unsubscribeFromWorkflowErrors(workflowTemplate.id, { userData: { userId: headId } });
        });
      }

      // Save to access history.
      await global.models.accessHistory.save({
        currentUser: currentUser,
        operationType: 'deleted-from-head-unit',
        user: {
          ...head,
          userId: headId,
        },
        unit: unit,
      });
    }

    return { beforeUpdatedUnit: unit, afterUpdatedUnit: lastUpdatedUnit };
  }

  /**
   * Add members.
   * @param {object} params Params.
   * @param {number} params.id ID.
   * @param {string[]} params.members Members.
   * @param {object} params.currentUser Current user.
   * @param {boolean} params.isForce Force.
   * @returns {Promise<{beforeUpdatedUnit: UnitEntity, afterUpdatedUnit: UnitEntity}>}
   */
  async addMembers({ unitIds, id, members, currentUser, isForce }) {
    if (!isForce) {
      this.checkAccess(id, unitIds);
    }

    const unit = await global.models.unit.findById(id);

    if (!unit) {
      return;
    }

    // Add user to unit members if this user isn't members yet.
    const existingMembers = unit.members;
    const membersToAdd = members.filter((member) => !existingMembers.includes(member));
    if (membersToAdd.length === 0) {
      return { beforeUpdatedUnit: unit, afterUpdatedUnit: unit };
    }

    let lastUpdatedUnit;
    for (const memberId of membersToAdd) {
      const { basedOn = [] } = unit;

      const member = await this.authService.findByUserId(memberId);

      for (const baseUnitId of basedOn) {
        await global.models.unit.addMember(baseUnitId, memberId);

        // Save to access history.
        const baseUnit = await global.models.unit.findById(baseUnitId);
        await global.models.accessHistory.save({
          currentUser: currentUser,
          operationType: 'added-to-member-unit',
          user: {
            ...member,
            userId: memberId,
          },
          unit: baseUnit,
        });
      }

      lastUpdatedUnit = await global.models.unit.addMember(id, memberId);

      // Save to access history.
      await global.models.accessHistory.save({
        currentUser: currentUser,
        operationType: 'added-to-member-unit',
        user: {
          ...member,
          userId: memberId,
        },
        unit: unit,
      });
    }

    return { beforeUpdatedUnit: unit, afterUpdatedUnit: lastUpdatedUnit };
  }

  /**
   * Remove members.
   * @param {object} params Params.
   * @param {number} params.id ID.
   * @param {string[]} params.members Members.
   * @param {object} params.currentUser Current user.
   * @returns {Promise<{beforeUpdatedUnit: UnitEntity, afterUpdatedUnit: UnitEntity}>}
   */
  async removeMembers({ unitIds, id, members, currentUser }) {
    this.checkAccess(id, unitIds);

    const unit = await global.models.unit.findById(id);

    if (!unit) {
      return;
    }

    // Remove user from unit members if this user is member.
    const existingMembers = unit.members;
    const membersToRemove = members.filter((member) => existingMembers.includes(member));
    if (membersToRemove.length === 0) {
      return { beforeUpdatedUnit: unit, afterUpdatedUnit: unit };
    }

    let lastUpdatedUnit;
    for (const memberId of membersToRemove) {
      const member = await this.authService.findByUserId(memberId);

      lastUpdatedUnit = await global.models.unit.removeMember(id, memberId);

      // Remove performer user from tasks.
      await global.models.task.removePerformerUserFromTasks(memberId, id);

      //If removed from SUPPORT_ADMIN_UNIT unsubscribe from errors
      if (lastUpdatedUnit.id === SUPPORT_ADMIN_UNIT) {
        const options = {
          where: {},
          attributes: ['id', 'errors_subscribers'],
        };
        const allWorkflowTemplates = await global.models.workflowTemplate.getAll(options);
        const subscribedWorkflowTemplates = allWorkflowTemplates.filter(({ errorsSubscribers }) =>
          errorsSubscribers.some((el) => el.id === memberId),
        );

        subscribedWorkflowTemplates.forEach((workflowTemplate) => {
          global.businesses.workflow.unsubscribeFromWorkflowErrors(workflowTemplate.id, { userData: { userId: memberId } });
        });
      }

      // Save to access history.
      await global.models.accessHistory.save({
        currentUser: currentUser,
        operationType: 'deleted-from-member-unit',
        user: {
          ...member,
          userId: memberId,
        },
        unit: unit,
      });
    }

    return { beforeUpdatedUnit: unit, afterUpdatedUnit: lastUpdatedUnit };
  }

  /**
   * Delete unit by ID.
   * @param {number} id Unit ID.
   * @param {object} unit Unit.
   * @param {object} currentUser Current user.
   * @returns {Promise<UnitEntity>}
   */
  async deleteById(id, unit, currentUser) {
    // Decline delete units(Security, System, Support).
    if (id === SECURITY_ADMIN_UNIT || id === SYSTEM_ADMIN_UNIT || id === SUPPORT_ADMIN_UNIT) {
      throw new Error('Can\'t delete this unit.');
    }

    const deletedUnit = await global.models.unit.deleteById(id);

    let foundUsersFromAuthService = [];
    foundUsersFromAuthService = await this.authService.getUsersByIdsWithCache([...unit.members, ...unit.heads], foundUsersFromAuthService);

    for (const memberId of unit.members) {
      const member = foundUsersFromAuthService.find((v) => v.userId === memberId);

      // Save to access history.
      await global.models.accessHistory.save({
        currentUser: currentUser,
        operationType: 'deleted-from-member-unit',
        user: {
          ...member,
          userId: memberId,
        },
        unit: unit,
      });
    }

    for (const headId of unit.heads) {
      const head = foundUsersFromAuthService.find((v) => v.userId === headId);

      // Save to access history.
      await global.models.accessHistory.save({
        currentUser: currentUser,
        operationType: 'deleted-from-head-unit',
        user: {
          ...head,
          userId: headId,
        },
        unit: unit,
      });
    }

    return deletedUnit;
  }

  /**
   * Find Unit by ID.
   * @param {number} id Unit ID.
   * @param {object} unitIds Unit Ids.
   * @returns {Promise<UnitEntity>}
   */
  async findById(id, unitIds) {
    this.checkAccess(id, unitIds);

    return await global.models.unit.findById(id);
  }

  /**
   * Export units.
   * @param {number[]} ids Unit IDs.
   * @returns {Promise<string>}
   */
  async export(ids) {
    const units = await global.models.unit.getByIds(ids);
    const preparedToExportUnits = units.map((unit) => unit.getPreparedForExport());
    return preparedToExportUnits;
  }

  /**
   * Import units.
   * @param {string} data Data.
   * @param {boolean} force Force.
   * @param {object} params params.
   * @param {object} params.user User.
   * @returns {Promise<boolean>}
   */
  async import(data, force = false, { user }) {
    data = JSON.parse(data);

    const unitTransaction = await global.db.transaction();

    try {
      for (const unit of data) {
        if ((await global.models.unit.findById(unit.id)) && force === false) {
          throw new Exceptions.COMMITED(Exceptions.COMMITED.Messages.UNIT);
        }
        const updateLastUnitIdIfNeedIt = true;
        await global.models.unit.create(new UnitEntity(unit), unitTransaction, updateLastUnitIdIfNeedIt);
      }

      await unitTransaction.commit();

      await global.log.save('user-imported-units', { user, data: data });
    } catch (error) {
      await unitTransaction.rollback();
      throw error;
    }

    return true;
  }

  async checkContentConfilcts(unitBefore, unitEntity) {
    let conflicts = [];
    for (const field in UNIT_PREVIOUS_DATA_MAP) {
      const previousUnitKey = UNIT_PREVIOUS_DATA_MAP[field];
      const previousExists = unitEntity[previousUnitKey];
      const haveDifference = previousExists && _.xor(unitBefore[field], unitEntity[previousUnitKey]).length;
      if (!haveDifference) continue;
      conflicts.push(field);
    }
    if (conflicts.length > 0) {
      throw new Exceptions.UNIT(Exceptions.UNIT.Messages.CONFLICTS.replace('{{conflicts}}', conflicts.join(', ')), 'Conflict', 409);
    }
  }

  /**
   * Create unit rules.
   * @param {object} data Data: data.type, data.ruleSchema.
   */
  async createUnitRules({ type, ruleSchema }) {
    return await global.models.unitRules.create({ type, ruleSchema });
  }

  /**
   * Update unit rules by type.
   * @param {object} data Data: data.type, data.ruleSchema.
   */
  async updateRulesByType({ type, ruleSchema }) {
    return await global.models.unitRules.update({ type, ruleSchema });
  }

  /**
   * Get all unit rules.
   */
  async getAllUnitRules() {
    return await global.models.unitRules.getAll();
  }

  /**
   * Delete unit rules by type.
   * @param {object} data Data: data.type.
   */
  async deleteRulesByType({ type }) {
    return await global.models.unitRules.deleteByRuleType(type);
  }

  /**
   * Check units exclusive rules.
   * @param {UnitEntity} unitEntity Unit Entity.
   */
  async checkUnitsExclusiveRules({ unitId, userIds }) {
    // Get unit exclusive rules.
    const unitsExclusiveRules = (await global.models.unitRules.getRulesByType('exclusive')) || [];
    if (unitsExclusiveRules.length === 0) {
      return;
    }

    // Get all users units.
    const allUnits = await global.models.unit.getAll();
    const unitsForEachUser = {};
    for (const userId of userIds) {
      const head = allUnits.filter((v) => v.heads.includes(userId));
      const member = allUnits.filter((v) => v.members.includes(userId));
      const allUserUnits = [...new Set([...head, ...member])];
      const allUserUnitIds = allUserUnits.map((v) => v.id);
      unitsForEachUser[userId] = allUserUnitIds;
    }

    for (const prop in unitsForEachUser) {
      for (const unit of unitsForEachUser[prop]) {
        if (unitsExclusiveRules.some((v) => v.includes(unit) && v.includes(unitId) && unit !== unitId)) {
          throw new Error(`Unit exclusive rules error with user ${prop}.`);
        }
      }
    }
  }

  /**
   * Check access.
   * @param {number} unitId Unit ID.
   * @param {object} userUnitIds User unit IDs.
   */
  checkAccess(unitId, userUnitIds) {
    if (
      userUnitIds.all.some((v) => v === UNIT_ADMIN_UNIT) &&
      !userUnitIds.all.some((v) => v === SECURITY_ADMIN_UNIT) &&
      !userUnitIds.head.some((v) => v === unitId)
    ) {
      throw new Exceptions.ACCESS(Exceptions.ACCESS.Messages.UNIT);
    }
  }
}
