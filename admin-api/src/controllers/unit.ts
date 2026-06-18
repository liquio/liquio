const { matchedData } = require('express-validator');

const Controller = require('./controller');
const Stream = require('../lib/stream');
const UnitBusiness = require('../businesses/unit');
const UnitEntity = require('../entities/unit');
const CustomLogs = require('../services/custom_logs');
const { ADMIN_UNITS } = require('../constants/unit');

/**
 * Unit controller.
 */
class UnitController extends Controller {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!UnitController.singleton) {
      super(config);
      this.unitBusiness = new UnitBusiness(config);
      this.customLogs = new CustomLogs({});
      UnitController.singleton = this;
    }
    return UnitController.singleton;
  }

  /**
   * Create.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async create(req, res) {
    try {
      const bodyData = matchedData(req, { locations: ['body'] });

      const unitEntity = new UnitEntity(bodyData);

      const currentUser = this.getRequestUserBaseInfo(req);

      const afterUpdatedUnit = await this.unitBusiness.create(unitEntity, currentUser);

      await log.save('user-created-unit', { user: currentUser, data: afterUpdatedUnit });

      this.responseData(res, afterUpdatedUnit);

      // Save custom logs.
      this.customLogs.saveCustomLog({
        operationType: 'admin-create-unit',
        request: res.responseMeta,
        unitAfter: afterUpdatedUnit,
      });
    } catch (error) {
      return this.responseError(res, error);
    }
  }

  /**
   * Update.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async update(req, res) {
    try {
      const { id } = matchedData(req, { locations: ['params'] });
      const bodyData = matchedData(req, { locations: ['body'] });

      const unitEntity = new UnitEntity({
        id,
        ...bodyData,
      });

      const beforeUpdatedUnit = await this.unitBusiness.findById(id, req.authUserUnitIds);

      // Check if the user is trying to update name and/or description of admin unit.
      if (ADMIN_UNITS.includes(parseInt(id))) {
        if (beforeUpdatedUnit.name !== unitEntity.name || beforeUpdatedUnit.description !== unitEntity.description)
          return this.responseError(res, 'You cannot update name and/or description of admin unit.', 403);
      }

      await this.unitBusiness.checkContentConfilcts(beforeUpdatedUnit, bodyData);

      // Check units exclusive rules.
      const unitId = unitEntity.id;
      const members = unitEntity.members;
      const heads = unitEntity.heads;
      const userIds = [...members, ...heads];
      await this.unitBusiness.checkUnitsExclusiveRules({ unitId, userIds });

      const currentUser = this.getRequestUserBaseInfo(req);

      const {
        updatedUnit: afterUpdatedUnit,
        newHeads,
        newMembers,
        newHeadsIpn,
        newMembersIpn,
        removedHeads,
        removedMembers,
        removedHeadsIpn,
        removedMembersIpn,
      } = await this.unitBusiness.update(req.authUserUnitIds, unitEntity, currentUser);

      await log.save('user-updated-unit', {
        user: currentUser,
        data: afterUpdatedUnit,
        unitId: id,
        newHeads,
        newMembers,
        newHeadsIpn,
        newMembersIpn,
        removedHeads,
        removedMembers,
        removedHeadsIpn,
        removedMembersIpn,
      });

      this.responseData(res, afterUpdatedUnit);

      // Save custom logs.
      this.customLogs.saveCustomLog({
        operationType: 'admin-update-unit',
        request: res.responseMeta,
        unitBefore: beforeUpdatedUnit,
        unitAfter: afterUpdatedUnit,
      });
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode);
    }
  }

  /**
   * Add heads.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async addHeads(req, res) {
    try {
      const { id } = matchedData(req, { locations: ['params'] });
      const { heads } = matchedData(req, { locations: ['body'] });

      const currentUser = this.getRequestUserBaseInfo(req);

      // Check units exclusive rules.
      await this.unitBusiness.checkUnitsExclusiveRules({ unitId: id, userIds: heads });

      const { beforeUpdatedUnit, afterUpdatedUnit } =
        (await this.unitBusiness.addHeads({
          unitIds: req.authUserUnitIds,
          id,
          heads,
          currentUser,
        })) || {};

      const isSuccess = afterUpdatedUnit.heads.length > beforeUpdatedUnit.heads.length;
      await log.save('user-added-heads-unit', {
        user: currentUser,
        data: { isSuccess, beforeUpdatedUnit, afterUpdatedUnit },
        unitId: id,
        addedHeads: heads,
      });

      this.responseData(res, afterUpdatedUnit);

      // Save custom logs.
      this.customLogs.saveCustomLog({
        operationType: 'admin-add-unit-heads',
        request: res.responseMeta,
        unitBefore: beforeUpdatedUnit,
        unitAfter: afterUpdatedUnit,
      });
    } catch (error) {
      return this.responseError(res, error);
    }
  }

  /**
   * Remove heads.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async removeHeads(req, res) {
    try {
      const { id } = matchedData(req, { locations: ['params'] });
      const { heads } = matchedData(req, { locations: ['body'] });

      const currentUser = this.getRequestUserBaseInfo(req);

      const { beforeUpdatedUnit, afterUpdatedUnit } =
        (await this.unitBusiness.removeHeads({
          unitIds: req.authUserUnitIds,
          id,
          heads,
          currentUser,
        })) || {};

      const isSuccess = afterUpdatedUnit.heads.length < beforeUpdatedUnit.heads.length;
      await log.save('user-removed-heads-unit', {
        user: currentUser,
        data: { isSuccess, beforeUpdatedUnit, afterUpdatedUnit },
        unitId: id,
        removedHeads: heads,
      });

      this.responseData(res, afterUpdatedUnit);

      // Save custom logs.
      this.customLogs.saveCustomLog({
        operationType: 'admin-remove-unit-heads',
        request: res.responseMeta,
        unitBefore: beforeUpdatedUnit,
        unitAfter: afterUpdatedUnit,
      });
    } catch (error) {
      return this.responseError(res, error);
    }
  }

  /**
   * Add members.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async addMembers(req, res) {
    try {
      const { id } = matchedData(req, { locations: ['params'] });
      const { members } = matchedData(req, { locations: ['body'] });

      const currentUser = this.getRequestUserBaseInfo(req);

      // Check units exclusive rules.
      await this.unitBusiness.checkUnitsExclusiveRules({ unitId: id, userIds: members });

      const { beforeUpdatedUnit, afterUpdatedUnit } =
        (await this.unitBusiness.addMembers({
          unitIds: req.authUserUnitIds,
          id,
          members,
          currentUser,
        })) || {};

      const isSuccess = afterUpdatedUnit.members.length > beforeUpdatedUnit.members.length;
      await log.save('user-added-members-unit', {
        user: currentUser,
        data: { isSuccess, beforeUpdatedUnit, afterUpdatedUnit },
        unitId: id,
        addedMembers: members,
      });

      this.responseData(res, afterUpdatedUnit);

      // Save custom logs.
      this.customLogs.saveCustomLog({
        operationType: 'admin-add-unit-members',
        request: res.responseMeta,
        unitBefore: beforeUpdatedUnit,
        unitAfter: afterUpdatedUnit,
      });
    } catch (error) {
      return this.responseError(res, error);
    }
  }

  /**
   * Remove members.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async removeMembers(req, res) {
    try {
      const { id } = matchedData(req, { locations: ['params'] });
      const { members } = matchedData(req, { locations: ['body'] });

      const currentUser = this.getRequestUserBaseInfo(req);

      const { beforeUpdatedUnit, afterUpdatedUnit } =
        (await this.unitBusiness.removeMembers({
          unitIds: req.authUserUnitIds,
          id,
          members,
          currentUser,
        })) || {};

      const isSuccess = afterUpdatedUnit.members.length < beforeUpdatedUnit.members.length;
      await log.save('user-removed-members-unit', {
        user: currentUser,
        data: { isSuccess, beforeUpdatedUnit, afterUpdatedUnit },
        unitId: id,
        removedMembers: members,
      });

      this.responseData(res, afterUpdatedUnit);

      // Save custom logs.
      this.customLogs.saveCustomLog({
        operationType: 'admin-remove-unit-members',
        request: res.responseMeta,
        unitBefore: beforeUpdatedUnit,
        unitAfter: afterUpdatedUnit,
      });
    } catch (error) {
      return this.responseError(res, error);
    }
  }

  /**
   * Get all with pagination.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getAllWithPagination(req, res) {
    const queryData = matchedData(req, { locations: ['query'] });
    const sort = queryData.sort || {};
    const filters = queryData.filters || {};
    const { page, count } = queryData;

    let units;
    try {
      units = await this.unitBusiness.getAllWithPagination({
        userId: req.authUserId,
        unitIds: req.authUserUnitIds?.all,
        currentPage: page,
        perPage: count,
        sort: sort,
        filters: filters,
      });
    } catch (error) {
      return this.responseError(res, error);
    }
    units.data = units.data.map(this.addAdminUnitLabel);

    this.responseData(res, units, true);
  }

  /**
   * Get all.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getAll(req, res) {
    const queryData = matchedData(req, { locations: ['query'] });
    const filters = queryData.filters || {};

    let units;
    try {
      units = await this.unitBusiness.getAll({ filters });
      units = units
        .map((v) => {
          return { id: v.id, name: v.name };
        })
        .map(this.addAdminUnitLabel);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, units);
  }

  /**
   * Delete by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async delete(req, res) {
    try {
      const paramsData = matchedData(req, { locations: ['params'] });
      const id = paramsData.id;

      // Check if the user is trying to delete an admin unit.
      if (ADMIN_UNITS.includes(parseInt(id))) {
        return this.responseError(res, 'You cannot delete an admin unit.', 403);
      }

      const currentUser = this.getRequestUserBaseInfo(req);

      const beforeUpdatedUnit = await this.unitBusiness.findById(id, req.authUserUnitIds);
      if (!beforeUpdatedUnit) {
        return this.responseError(res, 'Not found.', 404);
      }

      await this.unitBusiness.deleteById(id, beforeUpdatedUnit, currentUser);

      await log.save('user-deleted-unit', { user: currentUser, data: { id } });

      this.responseThatAccepted(res);

      // Save custom logs.
      this.customLogs.saveCustomLog({
        operationType: 'admin-delete-unit',
        request: res.responseMeta,
        unitBefore: beforeUpdatedUnit,
      });
    } catch (error) {
      return this.responseError(res, error);
    }
  }

  /**
   * Find by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async findById(req, res) {
    const paramsData = matchedData(req, { locations: ['params'] });
    const id = paramsData.id;
    let unit;

    try {
      unit = await this.unitBusiness.findById(id, req.authUserUnitIds);
      if (!unit) {
        return this.responseError(res, 'Not found.', 404);
      }
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode);
    }
    unit = this.addAdminUnitLabel(unit);

    this.responseData(res, unit);
  }

  /**
   * Export.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async export(req, res) {
    const bodyData = matchedData(req, { locations: ['body'] });
    const { ids } = bodyData;
    let units;

    try {
      units = await this.unitBusiness.export(ids);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseFile(res, units, 'application/bpmn', 'units.bpmn');
  }

  /**
   * Import.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async import(req, res) {
    const queryData = matchedData(req, { locations: ['query'] });
    const force = queryData.force || false;

    try {
      let fileContentBuffer;
      let chunks = [];
      req.on('data', (data) => chunks.push(data));
      req.on('end', () => {
        fileContentBuffer = Buffer.concat(chunks);
      });
      await Stream.waitEndEvent(req);

      let data = fileContentBuffer.toString();

      const currentUser = this.getRequestUserBaseInfo(req);
      await this.unitBusiness.import(data, force, { user: currentUser });
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode);
    }

    this.responseThatAccepted(res);
  }

  /**
   * Create rules.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async createRules(req, res) {
    const bodyData = matchedData(req, { locations: ['body'] });

    let createdUnitsRules;
    try {
      createdUnitsRules = await this.unitBusiness.createUnitRules({ ...bodyData });
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode);
    }

    this.responseData(res, createdUnitsRules);
  }

  /**
   * Update rules by type.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async updateRulesByType(req, res) {
    const bodyData = matchedData(req, { locations: ['body'] });

    let updatedUnitsRules;
    try {
      updatedUnitsRules = await this.unitBusiness.updateRulesByType({ ...bodyData });
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode);
    }

    this.responseData(res, updatedUnitsRules);
  }

  /**
   * Update rules by type.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getAllUnitRules(req, res) {
    let unitsRules;
    try {
      unitsRules = await this.unitBusiness.getAllUnitRules();
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode);
    }

    this.responseData(res, unitsRules);
  }

  /**
   * Delete rules by type.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async deleteRulesByType(req, res) {
    const queryData = matchedData(req, { locations: ['query'] });

    let result;
    try {
      result = await this.unitBusiness.deleteRulesByType({ ...queryData });
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode);
    }

    this.responseData(res, result);
  }

  addAdminUnitLabel(unit) {
    return {
      ...unit,
      adminUnit: ADMIN_UNITS.includes(unit.id),
    };
  }
}

module.exports = UnitController;
