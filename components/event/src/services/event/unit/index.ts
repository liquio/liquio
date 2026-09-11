import _ from 'lodash';

import { UnitResult } from './unit_result';
import { EventUser } from '../user/index';
import { UnitRulesModel } from '../../../models/unit_rules';

/**
 * Event unit.
 * @typedef {import('../../../models/unit').UnitModel} UnitModel Unit model.
 * @typedef {import('../../../models/access_history').AccessHistoryModel} AccessHistoryModel Access history model.
 */
export class EventUnit {
  static singleton: EventUnit;

  config: any;
  userService: EventUser;
  unitRulesModel: UnitRulesModel;

  /**
   * Event unit constructor.
   * @param {object} config Event unit config.
   */
  constructor(config: any) {
    // Define singleton.
    if (!EventUnit.singleton) {
      // Save params.
      this.config = config;
      this.userService = new EventUser(config.user);
      this.unitRulesModel = new UnitRulesModel();

      // Set singleton.
      EventUnit.singleton = this;
    }

    // Return singleton.
    return EventUnit.singleton;
  }

  /**
   * Create unit.
   * @param {object} params Params.
   * @param {object} params.unitData Unit Data.
   * @param {UnitModel} params.unitModel Unit model.
   * @param {AccessHistoryModel} params.accessHistoryModel Access history model.
   * @param {string} params.workflowId Workflow ID.
   * @param {string} params.eventTemplate Event template ID.
   * @returns {Promise<UnitResult>} Unit result promise.
   */
  async create({ unitData, unitModel, accessHistoryModel, workflowId, eventTemplate }: any): Promise<UnitResult> {
    let unit: any;
    let exceptionMessage: string | undefined;
    try {
      unit = await unitModel.create(unitData);

      // Save to access history.
      for (const memberId of unitData.members) {
        await accessHistoryModel.save({
          operationType: 'added-to-member-unit',
          user: { userId: memberId },
          unit: unit,
          workflow: { id: workflowId },
        });
      }
      for (const memberIpn of unitData.membersIpn) {
        await accessHistoryModel.save({
          operationType: 'added-to-member-unit',
          user: { ipn: memberIpn },
          unit: unit,
          workflow: { id: workflowId },
        });
      }
      for (const headId of unitData.heads) {
        await accessHistoryModel.save({
          operationType: 'added-to-head-unit',
          user: { userId: headId },
          unit: unit,
          workflow: { id: workflowId },
        });
      }
      for (const headIpn of unitData.headsIpn) {
        await accessHistoryModel.save({
          operationType: 'added-to-head-unit',
          user: { ipn: headIpn },
          unit: unit,
          workflow: { id: workflowId },
        });
      }
    } catch (error: any) {
      exceptionMessage = error && error.message;
      global.log.save('event-unit-create-error', { error: exceptionMessage, stack: error.stack, unitData });
      throw error;
    }

    // Log user's units.
    const { heads = [], members = [], headsIpn = [], membersIpn = [] } = unitData;
    global.log.save('unit-created-with-users', { workflowId, eventTemplate, unitId: unit && unit.id, heads, members, headsIpn, membersIpn });

    // Create and return result.
    const unitResult = new UnitResult('create', unit.id, unit, exceptionMessage);
    return unitResult;
  }

  /**
   * Update unit.
   * @param {object} params Params.
   * @param {object} params.unitData Unit Data.
   * @param {UnitModel} params.unitModel Unit model.
   * @param {AccessHistoryModel} params.accessHistoryModel Access history model.
   * @param {TaskModel} params.taskModel Task model.
   * @param {string} params.workflowId Workflow ID.
   * @param {string} params.eventTemplate Event template ID.
   * @returns {Promise<UnitResult>} Unit result promise.
   */
  async update({ unitData, unitModel, accessHistoryModel, taskModel, workflowId, eventTemplate, removeFromBaseUnits }: any): Promise<UnitResult> {
    let unit: any;
    let exceptionMessage: string | undefined;
    try {
      const currentUnit = await unitModel.findById(unitData.id);
      const newHeads = _.difference(unitData.heads, currentUnit.heads);
      const newMembers = _.difference(unitData.members, currentUnit.members);
      const newHeadsIpn = _.difference(unitData.headsIpn, currentUnit.headsIpn);
      const newMembersIpn = _.difference(unitData.membersIpn, currentUnit.membersIpn);
      const removedHeads = _.difference(currentUnit.heads, unitData.heads);
      const removedMembers = _.difference(currentUnit.members, unitData.members);
      const removedHeadsIpn = _.difference(currentUnit.headsIpn, unitData.headsIpn);
      const removedMembersIpn = _.difference(currentUnit.membersIpn, unitData.membersIpn);

      const headMemberIds = [...newHeads, ...newMembers];
      const headMemberIpns = [...newHeadsIpn, ...newMembersIpn];
      await this.checkUnitExclusiveRules(unitModel, headMemberIds, headMemberIpns, unitData.id);

      unit = await unitModel.update(unitData);

      if (removeFromBaseUnits) {
        for (const baseUnitId of unitData.basedOn) {
          const baseUnit = await unitModel.findById(baseUnitId);
          if (!baseUnit) {
            continue;
          }
          const allMembers = _.uniq([...baseUnit.members, ...newMembers]);
          const removedMembersDiff = _.difference(allMembers, removedMembers);

          await unitModel.updateMembers(baseUnitId, removedMembersDiff);
        }
      }

      // Save to access history.
      for (const memberId of newMembers) {
        await accessHistoryModel.save({
          operationType: 'added-to-member-unit',
          user: { userId: memberId },
          unit: unit,
          workflow: { id: workflowId },
        });
      }
      for (const memberIpn of newMembersIpn) {
        await accessHistoryModel.save({
          operationType: 'added-to-member-unit',
          user: { ipn: memberIpn },
          unit: unit,
          workflow: { id: workflowId },
        });
      }
      for (const memberId of removedMembers) {
        // Remove performer user from tasks.
        await taskModel.removePerformerUserFromTasks(memberId, unitData.id);

        await accessHistoryModel.save({
          operationType: 'deleted-from-member-unit',
          user: { userId: memberId },
          unit: unit,
          workflow: { id: workflowId },
        });
      }
      for (const memberIpn of removedMembersIpn) {
        await accessHistoryModel.save({
          operationType: 'deleted-from-member-unit',
          user: { ipn: memberIpn },
          unit: unit,
          workflow: { id: workflowId },
        });
      }
      for (const headId of newHeads) {
        await accessHistoryModel.save({
          operationType: 'added-to-head-unit',
          user: { userId: headId },
          unit: unit,
          workflow: { id: workflowId },
        });
      }
      for (const headIpn of newHeadsIpn) {
        await accessHistoryModel.save({
          operationType: 'added-to-head-unit',
          user: { ipn: headIpn },
          unit: unit,
          workflow: { id: workflowId },
        });
      }
      for (const headId of removedHeads) {
        // Remove performer user from tasks.
        await taskModel.removePerformerUserFromTasks(headId, unitData.id);

        await accessHistoryModel.save({
          operationType: 'deleted-from-head-unit',
          user: { userId: headId },
          unit: unit,
          workflow: { id: workflowId },
        });
      }
      for (const headIpn of removedHeadsIpn) {
        await accessHistoryModel.save({
          operationType: 'deleted-from-head-unit',
          user: { ipn: headIpn },
          unit: unit,
          workflow: { id: workflowId },
        });
      }
    } catch (error: any) {
      exceptionMessage = error && error.message;
      global.log.save('event-unit-update-error', { error: exceptionMessage, stack: error.stack, unitData });
      throw error;
    }

    // Log user's units.
    const { heads = [], members = [], headsIpn = [], membersIpn = [] } = unitData;
    global.log.save('unit-updated-with-users', { workflowId, eventTemplate, unitId: unit && unit.id, heads, members, headsIpn, membersIpn });

    // Update and return result.
    const unitResult = new UnitResult('update', unit.id, unit, exceptionMessage);
    return unitResult;
  }

  /**
   * @param {object} headMemberIds Head and member Ids.
   * @param {object} headMemberIpns Head and member Ipns.
   */
  async checkUnitExclusiveRules(unitModel: any, headMemberIds: any[], headMemberIpns: any[], checkUnitId: any): Promise<void> {
    const checkUnitIdNumber = Number(checkUnitId);

    const codes = headMemberIpns;
    const usersByIpn = await this.userService.searchUser({ codes }, unitModel);
    const usersByIpnIds = usersByIpn.map((v: any) => v.userId);
    const allUserIds = [...headMemberIds, ...usersByIpnIds];

    // Get users units.
    const allUnits = await unitModel.getAll();
    const unitsForEachUser: Record<string, any> = {};
    for (const userId of allUserIds) {
      const head = allUnits.filter((v: any) => v.heads.includes(userId));
      const member = allUnits.filter((v: any) => v.members.includes(userId));
      const allUserUnits = [...new Set([...head, ...member])];
      const allUserUnitIds = allUserUnits.map((v: any) => v.id);
      unitsForEachUser[userId] = allUserUnitIds;
    }

    // Get unit exclusive rules.
    const unitExclusiveRules = await this.unitRulesModel.getAllByType('exclusive');
    if (unitExclusiveRules.length === 0) {
      return;
    }

    for (const prop in unitsForEachUser) {
      for (const unit of unitsForEachUser[prop]) {
        if (unitExclusiveRules.some((v: any) => v.includes(unit) && v.includes(checkUnitIdNumber) && unit !== checkUnitIdNumber)) {
          throw new Error(`Unit exclusive rules error with user ${prop}.`);
        }
      }
    }
  }
}
