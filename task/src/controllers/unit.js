const Controller = require('./controller');
const UnitModel = require('../models/unit');
const Auth = require('../services/auth');
const CustomLogs = require('../services/custom_logs');
const UnitRulesModel = require('../models/unit_rules');

// Constants.
const UNIT_EXCLUSIVE_RULE_TYPE = 'exclusive';

/**
 * Unit controller.
 */
class UnitController extends Controller {
  /**
   * Unit controller constructor.
   */
  constructor(config) {
    // Singleton.
    if (!UnitController.singleton) {
      // Set params.
      super();
      this.unitModel = new UnitModel();
      this.auth = new Auth().provider;
      this.customLogs = new CustomLogs();
      this.unitRulesModel = new UnitRulesModel();
      this.config = config;

      // Define singleton.
      UnitController.singleton = this;
    }
    return UnitController.singleton;
  }

  /**
   * Get all units.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getAll(req, res) {
    const userUnitIds = this.getRequestUserUnitIds(req);

    let units;
    try {
      units = await this.unitModel.getAll();
    } catch (error) {
      return this.responseError(res, error);
    }
    const userUnits = units.filter((v) => userUnitIds.all.includes(v.id));

    this.responseData(res, this.filterResponse(userUnits, true));
  }

  /**
   * Find unit by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async findById(req, res) {
    const id = req.params.id;
    let unit;
    try {
      unit = await this.unitModel.findById(id);
    } catch (error) {
      return this.responseError(res, error);
    }

    if (!unit) {
      return this.responseError(res, 'Unit not found.', 404);
    }

    this.responseData(res, this.filterResponse(unit));
  }

  /**
   * Find unit by ID as head (with detailed members info).
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async findByIdAsHead(req, res) {
    // Define params.
    const { id: unitIdRaw } = req.params;
    const unitId = parseInt(unitIdRaw);

    // Check access.
    const isRequestUserUnitHead = this.isRequestUserUnitHead(req, unitId);
    if (!isRequestUserUnitHead) {
      return this.responseError(res, 'User should be unit head.', 401);
    }

    // Find unit.
    let unit;
    try {
      unit = await this.unitModel.findById(unitId);
    } catch (error) {
      return this.responseError(res, error);
    }

    // Check unit.
    if (!unit) {
      return this.responseError(res, 'Unit not found.', 404);
    }

    // Append users info.
    const allNeededUsersIds = [...unit.members, ...unit.heads];
    const withPrivateProps = true;
    let allNeededUsersRaw;
    try {
      allNeededUsersRaw = await this.auth.getUsersByIds(allNeededUsersIds, withPrivateProps);
    } catch {
      return this.responseError(res, 'Users definition error.', 500);
    }
    let allNeededUsers;
    try {
      allNeededUsers = allNeededUsersRaw.map((v) => ({
        userId: v.userId,
        firstName: v.firstName,
        middleName: v.middleName,
        lastName: v.lastName,
        ipn: v.ipn,
        email: v.email,
        phone: v.phone,
      }));
    } catch (error) {
      return this.responseError(res, error);
    }

    unit.headsUsers = unit.heads.map((m) => allNeededUsers.find((nu) => nu.userId === m));
    unit.membersUsers = unit.members.map((m) => allNeededUsers.find((nu) => nu.userId === m));

    // Check optional project params.
    if (global.config?.custom?.optionalProjectParams?.userRoleUnits?.superHeadUnitId) {
      const { superHeadUnitId } = global.config.custom.optionalProjectParams.userRoleUnits;

      // Remove super head unit members from allowed user list.
      const units = await this.unitModel.getAll();
      const superHeadUnitMembers = units.find((unit) => unit.id === superHeadUnitId).members;
      unit.headsUsers = unit.headsUsers.filter((user) => user && !superHeadUnitMembers.includes(user.userId));
      unit.membersUsers = unit.membersUsers.filter((user) => user && !superHeadUnitMembers.includes(user.userId));

      const isRequestUserIsMemberOfSuperHeadUnit = this.isRequestUserUnitMember(req, superHeadUnitId);
      if (!isRequestUserIsMemberOfSuperHeadUnit) {
        delete unit.headsUsers;
      }
    }

    this.responseData(res, unit);
  }

  /**
   * Add requested member.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async addRequestedMember(req, res) {
    // Define params.
    const { id: unitIdRaw } = req.params;
    const unitId = parseInt(unitIdRaw);
    const { ipn, firstName, middleName, lastName } = req.body;
    let requestedMember = { ipn, firstName, middleName, lastName };

    // Check requested params.
    if (!ipn || !lastName) {
      return this.responseError(res, 'Wrong requested member params.', 400);
    }

    // Check access.
    const isRequestUserUnitHead = this.isRequestUserUnitHead(req, unitId);
    if (!isRequestUserUnitHead) {
      return this.responseError(res, 'User should be unit head.', 401);
    }

    const currentUser = this.getRequestUserInfo(req);

    // Get unit.
    let unit;
    try {
      unit = await this.unitModel.findById(unitId);
    } catch (error) {
      return this.responseError(res, error);
    }

    // Check the same request already exist.
    const requestedMemberAlreadyExist = unit.requestedMembers.some(
      (v) =>
        v.ipn === ipn &&
        `${v.firstName}`.toLowerCase() === `${firstName}`.toLowerCase() &&
        `${v.middleName}`.toLowerCase() === `${middleName}`.toLowerCase() &&
        `${v.lastName}`.toLowerCase() === `${lastName}`.toLowerCase(),
    );
    const ipnAlreadyExist = unit.membersIpn.includes(ipn);
    if (requestedMemberAlreadyExist || ipnAlreadyExist) {
      return this.responseError(res, 'Requested member already in unit by IPN.', 400);
    }

    // Define existing user.
    const user = await this.auth.getUserByCode(ipn);
    const { userId, firstName: userFirstName, middleName: userMiddleName, lastName: userLastName } = user || {};
    const userAlreadyUnitMember = unit.members.includes(userId);
    const userAlreadyExist = !!user;
    const userAlreadyExistAndTheSame =
      `${firstName}`.toLowerCase() === `${userFirstName}`.toLowerCase() &&
      `${middleName}`.toLowerCase() === `${userMiddleName}`.toLowerCase() &&
      `${lastName}`.toLowerCase() === `${userLastName}`.toLowerCase();

    // Check units exclusive rules.
    const units = await this.unitModel.getAll();
    const defaultUnits = this.config.auth.defaultUnits || [];
    const head = units.filter((v) => v.heads.includes(userId));
    const member = units.filter((v) => v.members.includes(userId) || defaultUnits.includes(v.id));
    const allUserUnits = [...new Set([...head, ...member])];
    const allUserUnitsIds = allUserUnits.map((v) => v.id);

    let unitExclusiveRules;
    try {
      unitExclusiveRules = await this.unitRulesModel.getAllByType(UNIT_EXCLUSIVE_RULE_TYPE);
    } catch (error) {
      return this.responseError(res, error);
    }

    for (const userUnitId of allUserUnitsIds) {
      if (unitExclusiveRules.some((v) => v.includes(userUnitId) && v.includes(unitId) && userUnitId !== unitId)) {
        const unitExclusiveRulesError = new Error('Unit exclusive rules error!');
        return this.responseError(res, unitExclusiveRulesError);
      }
    }

    // Check user already unit member.
    if (userAlreadyUnitMember) {
      return this.responseError(res, 'Requested member already in unit by ID.', 400);
    }

    // Check user already exist and the same.
    if (userAlreadyExistAndTheSame) {
      // Update unit
      let updatedUnit;
      try {
        updatedUnit = await this.unitModel.addMember(unitId, userId);

        // Save to access history.
        await models.accessHistory.save({
          currentUser: currentUser,
          operationType: 'added-to-member-unit',
          user: {
            userId: userId,
            name: `${userLastName || ''} ${userFirstName || ''} ${userMiddleName || ''}`.trim(),
          },
          unit: updatedUnit,
        });
        const { basedOn = [] } = unit || {};
        for (const baseUnitId of basedOn) {
          await this.unitModel.addMember(baseUnitId, userId);

          // Save to access history.
          const baseUnit = await this.unitModel.findById(baseUnitId);
          await models.accessHistory.save({
            currentUser: currentUser,
            operationType: 'added-to-member-unit',
            user: {
              userId: userId,
              name: `${userLastName || ''} ${userFirstName || ''} ${userMiddleName || ''}`.trim(),
            },
            unit: baseUnit,
          });
        }

        // Save custom logs.
        this.customLogs.saveCustomLog({
          operationType: 'head-update-unit-members',
          request: res.responseMeta,
          unitBefore: unit,
          unitAfter: updatedUnit,
        });
      } catch (error) {
        return this.responseError(res, error);
      }

      return this.responseData(res, updatedUnit);
    }

    // Check user already exist but not the same (the same user handled before).
    if (userAlreadyExist) {
      return this.responseError(res, 'Requested member with wrong name.', 400);
    }

    // Update unit
    let updatedUnit;
    try {
      updatedUnit = await this.unitModel.addRequestedMember(unitId, requestedMember);

      // Save custom logs.
      this.customLogs.saveCustomLog({
        operationType: 'head-update-unit-members',
        request: res.responseMeta,
        unitBefore: unit,
        unitAfter: updatedUnit,
      });
    } catch (error) {
      return this.addRequestedMember(res, error);
    }

    this.responseData(res, updatedUnit);
  }

  /**
   * Remove member.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async removeMember(req, res) {
    // Define params.
    const { id: unitIdRaw } = req.params;
    const unitId = parseInt(unitIdRaw);
    const { userId, ipn } = req.body;

    // Check params.
    if ((!userId && !ipn) || (userId && ipn)) {
      return this.responseError(res, 'User ID or IPN should be defined. And only one of them.', 400);
    }

    // Check access.
    const isRequestUserUnitHead = this.isRequestUserUnitHead(req, unitId);
    if (!isRequestUserUnitHead) {
      return this.responseError(res, 'User should be unit head.', 401);
    }

    const currentUser = this.getRequestUserInfo(req);

    // Get unit.
    let unit;
    try {
      unit = await this.unitModel.findById(unitId);
    } catch (error) {
      return this.responseError(res, error);
    }

    let updatedUnit;

    // Remove by user ID.
    if (userId) {
      // Check user based units.
      let units;
      let user;
      let userFirstName;
      let userMiddleName;
      let userLastName;
      try {
        units = await this.unitModel.getAll();
        [user] = await this.auth.getUsersByIds(userId);
        ({ firstName: userFirstName, middleName: userMiddleName, lastName: userLastName } = user || {});
      } catch (error) {
        return this.responseError(res, error);
      }
      const unit = units.find((v) => v.id === unitId);
      const { basedOn: basedOnUnitIds } = unit;

      // Try to remove.
      try {
        updatedUnit = await this.unitModel.removeMember(unitId, userId);

        // Remove performer user from tasks.
        await models.task.removePerformerUserFromTasks(userId, unitId);

        // Save to access history.
        await models.accessHistory.save({
          currentUser: currentUser,
          operationType: 'deleted-from-member-unit',
          user: {
            userId: userId,
            name: `${userLastName || ''} ${userFirstName || ''} ${userMiddleName || ''}`.trim(),
          },
          unit: updatedUnit,
        });
      } catch (error) {
        return this.responseError(res, error);
      }

      // Remove from based units if need it.
      const userUnits = units.filter((v) => v.members.includes(userId) || v.heads.includes(userId));
      for (const basedOnUnitId of basedOnUnitIds) {
        // Check id no need to remove from based unit
        const isOtherUnitsExistsWithThisBase = userUnits.some((v) => v.id !== unitId && v.basedOn.includes(basedOnUnitId));
        if (isOtherUnitsExistsWithThisBase) {
          continue;
        }

        // Try to remove from based unit.
        try {
          updatedUnit = await this.unitModel.removeMember(basedOnUnitId, userId);

          // Save to access history.
          const baseUnit = await this.unitModel.findById(basedOnUnitId);
          await models.accessHistory.save({
            currentUser: currentUser,
            operationType: 'deleted-from-member-unit',
            user: {
              userId: userId,
              name: `${userLastName || ''} ${userFirstName || ''} ${userMiddleName || ''}`.trim(),
            },
            unit: baseUnit,
          });
        } catch (error) {
          return this.responseError(res, error);
        }
      }
    }

    // Remove by user IPN.
    if (ipn) {
      try {
        updatedUnit = await this.unitModel.removeMemberIpn(unitId, ipn);
        updatedUnit = await this.unitModel.removeRequestedMember(unitId, ipn);

        const user = await this.auth.getUserByCode(ipn);
        const { firstName: userFirstName, middleName: userMiddleName, lastName: userLastName } = user || {};

        // Remove performer user from tasks.
        await models.task.removePerformerUserFromTasks(user.userId, unitId);

        // Save to access history.
        await models.accessHistory.save({
          currentUser: currentUser,
          operationType: 'deleted-from-member-unit',
          user: {
            ipn: ipn,
            name: `${userLastName || ''} ${userFirstName || ''} ${userMiddleName || ''}`.trim(),
          },
          unit: updatedUnit,
        });
      } catch (error) {
        return this.responseError(res, error);
      }
    }

    // Save custom logs.
    try {
      this.customLogs.saveCustomLog({
        operationType: 'head-update-unit-members',
        request: res.responseMeta,
        unitBefore: unit,
        unitAfter: updatedUnit,
      });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, updatedUnit);
  }

  /**
   * Get unit participants as head.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getUnitParticipantsAsHead(req, res) {
    // Define params.
    const { unitId, userId } = req.body;

    // Find unit.
    let unit;
    try {
      unit = await this.unitModel.findById(unitId);
    } catch (error) {
      return this.responseError(res, error);
    }

    // Check unit.
    if (!unit) {
      return this.responseError(res, 'Unit not found.', 404);
    }

    // Check unit.
    if (!unit.heads.includes(userId)) {
      return this.responseError(res, 'User must be head of unit.', 403);
    }

    // Append users info.
    const allNeededUsersIds = [...unit.members, ...unit.heads];

    let allNeededUsers;
    try {
      const allNeededUsersRaw = await this.auth.getUsersByIds(allNeededUsersIds, true);
      allNeededUsers = allNeededUsersRaw.map((v) => ({
        userId: v.userId,
        firstName: v.firstName,
        middleName: v.middleName,
        lastName: v.lastName,
        ipn: v.ipn,
        isHead: !!unit.heads.find((uid) => uid === v.userId),
        isMember: !!unit.members.find((uid) => uid === v.userId),
      }));
    } catch {
      return this.responseError(res, 'Users definition error.', 500);
    }

    this.responseData(res, allNeededUsers);
  }
}

module.exports = UnitController;
