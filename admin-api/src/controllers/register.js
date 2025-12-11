const { matchedData } = require('express-validator');
const axios = require('axios');

const Controller = require('./controller');
const Stream = require('../lib/stream');
const RegisterBusiness = require('../businesses/register');
const TaskService = require('../services/task');

/**
 * Register controller.
 */
class RegisterController extends Controller {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!RegisterController.singleton) {
      super(config);
      this.registerBusiness = new RegisterBusiness();
      this.taskService = new TaskService();
      RegisterController.singleton = this;
    }
    return RegisterController.singleton;
  }

  /**
   * Get registers.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getRegistersWithPagination(req, res) {
    const { id, key_id, name, offset, limit } = matchedData(req, { locations: ['query'] });
    let registers;
    try {
      registers = await this.registerBusiness.getRegistersWithPagination({
        id,
        key_id,
        name,
        offset,
        limit,
      });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, registers, true);
  }

  /**
   * Get registers.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getRegisters(req, res) {
    let registers;
    try {
      registers = await this.registerBusiness.getRegisters();
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, registers);
  }

  /**
   * Find register by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async findRegisterById(req, res) {
    const { id } = matchedData(req, { locations: ['params'] });
    let register;
    try {
      register = await this.registerBusiness.findRegisterById(id);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, register);
  }

  /**
   * Create register.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async createRegister(req, res) {
    const body = matchedData(req, { locations: ['body'] });

    // Delete createdByPerson and updatedByPerson from body.
    delete body?.meta?.createdByPerson;
    delete body?.meta?.updatedByPerson;

    let register;
    try {
      const user = this.getRequestUserBaseInfo(req);
      const accessInfo = this.getRequestAccessInfo(req);
      const createdByPerson = {
        userId: user.userId,
        name: user.name,
      };
      register = await this.registerBusiness.createRegister(
        {
          ...body,
          description: body.description || '',
          meta: {
            ...body.meta,
            createdByPerson,
          },
        },
        accessInfo,
      );
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, register);
  }

  /**
   * Update register by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async updateRegisterById(req, res) {
    const { id } = matchedData(req, { locations: ['params'] });
    const body = matchedData(req, { locations: ['body'] });

    // Delete createdByPerson and updatedByPerson from body.
    delete body?.meta?.createdByPerson;
    delete body?.meta?.updatedByPerson;

    let register;
    try {
      const user = this.getRequestUserBaseInfo(req);
      const accessInfo = this.getRequestAccessInfo(req);
      const updatedByPerson = {
        userId: user.userId,
        name: user.name,
      };

      const currentRegisterState = await this.registerBusiness.findRegisterById(id);
      if (!currentRegisterState) {
        throw new Error('Register not found.');
      }
      register = await this.registerBusiness.updateRegisterById(
        id,
        {
          ...body,
          description: body.description || '',
          meta: {
            ...body.meta,
            createdByPerson: currentRegisterState.meta?.createdByPerson,
            updatedByPerson,
          },
        },
        accessInfo,
      );
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, register);
  }

  /**
   * Delete register by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async deleteRegisterById(req, res) {
    const { id } = matchedData(req, { locations: ['params'] });
    let register;
    try {
      const accessInfo = this.getRequestAccessInfo(req);
      register = await this.registerBusiness.deleteRegisterById(id, accessInfo);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, register);
  }

  /**
   * Get register keys with pagination.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getKeysWithPagination(req, res) {
    const { register_id, offset, limit } = matchedData(req, { locations: ['query'] });

    let keys;
    try {
      keys = await this.registerBusiness.getKeysWithPagination({ register_id, offset, limit });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, keys, true);
  }

  /**
   * Get register keys.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getKeys(req, res) {
    const { register_id } = matchedData(req, { locations: ['query'] });

    let keys;
    try {
      keys = await this.registerBusiness.getKeys({ register_id });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, keys);
  }

  /**
   *
   * @param {Request} req
   * @param {Response} res
   * @returns
   */
  async updateIndexMapping(req, res) {
    const { key_id } = matchedData(req, { locations: ['params'] });
    const { mapping } = matchedData(req, { locations: ['body'] });

    let result;

    try {
      result = await this.registerBusiness.updateIndexMapping(key_id, mapping);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, result);
  }

  /**
   * Get register synced keys.
   */
  async getSyncedKeys(req, res) {
    const { ids } = matchedData(req, { locations: ['query'] });

    let keys;
    try {
      keys = await this.registerBusiness.getSyncedKeys(ids);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, keys);
  }

  /**
   * Get register all synced keys.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   * @returns {Promise<void>}
   */
  async getAllSyncedKeys(req, res) {
    let keys;
    try {
      keys = await this.registerBusiness.getAllSyncedKeys();
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, keys);
  }

  /**
   * Find key by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async findKeyById(req, res) {
    const { key_id } = matchedData(req, { locations: ['params'] });
    let key;
    try {
      key = await this.registerBusiness.findKeyById(key_id);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, key);
  }

  /**
   * Create key.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async createKey(req, res) {
    const body = matchedData(req, { locations: ['body'] });

    // Delete createdByPerson and updatedByPerson from body.
    delete body?.meta?.createdByPerson;
    delete body?.meta?.updatedByPerson;

    let key;
    try {
      const user = this.getRequestUserBaseInfo(req);
      const accessInfo = this.getRequestAccessInfo(req);
      const createdByPerson = {
        userId: user.userId,
        name: user.name,
      };

      // Update register updatedByPerson.
      const currentRegisterState = await this.registerBusiness.findRegisterById(body.registerId);
      if (!currentRegisterState) {
        throw new Error('Register not found.');
      }
      await this.registerBusiness.updateRegisterById(
        body.registerId,
        {
          ...currentRegisterState,
          meta: {
            ...currentRegisterState.meta,
            updatedByPerson: createdByPerson,
          },
        },
        accessInfo,
      );

      key = await this.registerBusiness.createKey(
        {
          ...body,
          description: body.description || '',
          meta: {
            ...body.meta,
            createdByPerson,
          },
        },
        accessInfo,
      );
      await this.taskService.deleteRegisterCache();
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, key);
  }

  /**
   * Update key by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async updateKeyById(req, res) {
    const { key_id } = matchedData(req, { locations: ['params'] });
    const body = matchedData(req, { locations: ['body'] });

    // Delete createdByPerson and updatedByPerson from body.
    delete body?.meta?.createdByPerson;
    delete body?.meta?.updatedByPerson;

    const { isPersonal } = body?.meta || {};
    if (isPersonal) {
      const unitAccess = await this.taskService.getUnitAccess({});

      // Check if the key is personal and strict access is disabled.
      const isStrictAccessEnabled = unitAccess?.some((item) => item?.data?.strictAccess?.keys.includes(parseInt(key_id)));
      if (isStrictAccessEnabled) {
        return this.responseError(res, new Error('Cannot set the key as personal when strict access is enabled.'));
      }
    }

    let key;
    try {
      const user = this.getRequestUserBaseInfo(req);
      const accessInfo = this.getRequestAccessInfo(req);
      const updatedByPerson = {
        userId: user.userId,
        name: user.name,
      };

      // Update register updatedByPerson.
      const currentRegisterState = await this.registerBusiness.findRegisterById(body.registerId);
      if (!currentRegisterState) {
        throw new Error('Register not found.');
      }
      await this.registerBusiness.updateRegisterById(
        body.registerId,
        {
          ...currentRegisterState,
          meta: {
            ...currentRegisterState.meta,
            updatedByPerson,
          },
        },
        accessInfo,
      );

      const currentKeyState = await this.registerBusiness.findKeyById(key_id);
      if (!currentKeyState) {
        throw new Error('Key not found.');
      }
      key = await this.registerBusiness.updateKeyById(
        key_id,
        {
          ...body,
          description: body.description || '',
          meta: {
            ...body.meta,
            createdByPerson: currentKeyState.meta.createdByPerson,
            updatedByPerson,
          },
        },
        accessInfo,
      );
      await this.taskService.deleteRegisterCache();
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, key);
  }

  /**
   * Delete key by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async deleteKeyById(req, res) {
    const { key_id } = matchedData(req, { locations: ['params'] });
    let key;
    try {
      const user = this.getRequestUserBaseInfo(req);
      const accessInfo = this.getRequestAccessInfo(req);
      const updatedByPerson = {
        userId: user.userId,
        name: user.name,
      };

      // Update register updatedByPerson.
      const currentKeyState = await this.registerBusiness.findKeyById(key_id);
      if (!currentKeyState) {
        throw new Error('Key not found.');
      }
      const currentRegisterState = await this.registerBusiness.findRegisterById(currentKeyState.registerId);
      if (!currentRegisterState) {
        throw new Error('Register not found.');
      }

      await this.registerBusiness.updateRegisterById(
        currentKeyState.registerId,
        {
          ...currentRegisterState,
          meta: {
            ...currentRegisterState.meta,
            updatedByPerson: updatedByPerson,
          },
        },
        accessInfo,
      );

      key = await this.registerBusiness.deleteKeyById(key_id, accessInfo);
      await this.taskService.deleteRegisterCache();
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, key);
  }

  /**
   * Get records.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getRecords(req, res) {
    const { register_id, key_id, offset, limit } = matchedData(req, { locations: ['query'] });

    let records;
    try {
      records = await this.registerBusiness.getRecords({ register_id, key_id, offset, limit });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, records, true);
  }

  /**
   * Find record by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async findRecordById(req, res) {
    const { record_id } = matchedData(req, { locations: ['params'] });
    let record;
    try {
      record = await this.registerBusiness.findRecordById(record_id);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, record);
  }

  /**
   * Create record.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async createRecord(req, res) {
    const body = matchedData(req, { locations: ['body'] });
    let record;
    try {
      const accessInfo = this.getRequestAccessInfo(req);
      record = await this.registerBusiness.createRecord(body, accessInfo);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, record);
  }

  /**
   * Import bulk records.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async importBulkRecords(req, res) {
    const {
      registerId,
      keyId,
      background = false,
      records,
    } = matchedData(req, {
      locations: ['body'],
    });
    let record;
    try {
      const accessInfo = this.getRequestAccessInfo(req);
      record = await this.registerBusiness.importBulkRecords({ registerId, keyId, background }, records, accessInfo);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, record);
  }

  /**
   * Update record by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async updateRecordById(req, res) {
    const { record_id } = matchedData(req, { locations: ['params'] });
    const body = matchedData(req, { locations: ['body'] });
    let record;
    try {
      const accessInfo = this.getRequestAccessInfo(req);
      record = await this.registerBusiness.updateRecordById(record_id, body, accessInfo);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, record);
  }

  /**
   * Delete record by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async deleteRecordById(req, res) {
    const { record_id } = matchedData(req, { locations: ['params'] });
    let record;
    try {
      const accessInfo = this.getRequestAccessInfo(req);
      record = await this.registerBusiness.deleteRecordById(record_id, accessInfo);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, record);
  }

  /**
   * Export.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async export(req, res) {
    const paramsData = matchedData(req, { locations: ['params'] });
    const queryData = matchedData(req, { locations: ['query'] });
    const id = paramsData.id;
    const withData = queryData.with_data || false;
    const file = queryData.file || false;
    let register;

    try {
      register = await this.registerBusiness.export(id, { withData, file });
      if (file) {
        const response = await axios({
          method: register.method,
          url: register.url,
          headers: register.headers,
          responseType: 'stream'
        });
        return response.data.pipe(res);
      }
      if (!register) {
        return this.responseError(res, 'Not found.', 404);
      }
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseFile(res, register, 'application/bpmn', 'register.bpmn');
  }

  /**
   * Import.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async import(req, res) {
    const queryData = matchedData(req, { locations: ['query'] });
    const force = queryData.force || false;
    const rewriteSchema = queryData.rewrite_schema || false;
    const clearRecords = queryData.clear_records || false;
    const addData = queryData.add_data || false;
    const file = queryData.file || false;
    const accessInfo = this.getRequestAccessInfo(req);

    try {
      if (file) {
        const register = await this.registerBusiness.import(
          {
            force,
            rewriteSchema,
            clearRecords,
            addData,
            file,
          },
          undefined,
          accessInfo,
        );
        const response = await axios({
          method: register.method,
          url: register.url,
          headers: register.headers,
          responseType: 'stream'
        });
        return req.pipe(response.data).pipe(res);
      } else {
        let fileContentBuffer;
        let chunks = [];
        req.on('data', (data) => chunks.push(data));
        req.on('end', () => {
          fileContentBuffer = Buffer.concat(chunks);
        });
        await Stream.waitEndEvent(req);

        let data = fileContentBuffer.toString();

        await this.registerBusiness.import(
          {
            force,
            rewriteSchema,
            clearRecords,
            addData,
            file,
          },
          data,
          accessInfo,
        );
      }
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode, error.details);
    }

    this.responseThatAccepted(res);
  }

  /**
   * Stream export.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async streamExport(req, res) {
    const { id } = matchedData(req, { locations: ['params'] });
    const { with_data: withData = false, file = false, key_ids: keyIds } = matchedData(req, { locations: ['query'] });
    let register;

    try {
      register = await this.registerBusiness.export(id, { withData, file, keyIds });
      if (file) {
        const response = await axios({
          method: register.method,
          url: register.url,
          headers: register.headers,
          responseType: 'stream'
        });
        return response.data.pipe(res);
      }
      if (!register) {
        return this.responseError(res, 'Not found.', 404);
      }
    } catch (error) {
      return this.responseError(res, error);
    }
    if (file) {
      return this.responseFile(res, register, 'application/bpmn', `register-${register.data.id}.dat`);
    }
    return this.responseData(res, register);
  }

  /**
   * Stream import.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async streamImport(req, res) {
    const { clear_records: clearRecords = false } = matchedData(req, { locations: ['query'] });
    try {
      const accessInfo = this.getRequestAccessInfo(req);
      const register = await this.registerBusiness.streamImport(clearRecords, accessInfo);
      const response = await axios({
        method: register.method,
        url: register.url,
        headers: register.headers,
        responseType: 'stream'
      });
      return req.pipe(response.data).pipe(res);
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode, error.details);
    }
  }

  /**
   * Import xlsx.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async importXlsx(req, res) {
    const paramsData = matchedData(req, { locations: ['params'] });
    const queryData = matchedData(req, { locations: ['query'] });
    const { id: registerId, keyId } = paramsData;
    const { unique, clear_records: clearRecords } = queryData;

    try {
      const user = this.getRequestUserBaseInfo(req);
      const accessInfo = this.getRequestAccessInfo(req);

      const updatedByPerson = {
        userId: user.userId,
        name: user.name,
      };

      // Update register updatedByPerson.
      const currentRegisterState = await this.registerBusiness.findRegisterById(registerId);
      if (!currentRegisterState) {
        throw new Error('Register not found.');
      }
      // Update key updatedByPerson.
      const currentKeyState = await this.registerBusiness.findKeyById(keyId);
      if (!currentKeyState) {
        throw new Error('Key not found.');
      }

      let data;
      let chunks = [];
      req.on('data', (data) => chunks.push(data));
      req.on('end', () => {
        data = Buffer.concat(chunks);
      });
      await Stream.waitEndEvent(req);

      await this.registerBusiness.importXlsx({ registerId, keyId, unique, clearRecords }, data, accessInfo);

      // Update register updatedByPerson.
      await this.registerBusiness.updateRegisterById(
        currentRegisterState.id,
        {
          ...currentRegisterState,
          meta: {
            ...currentRegisterState.meta,
            updatedByPerson,
          },
        },
        accessInfo,
      );
      // Update key updatedByPerson.
      await this.registerBusiness.updateKeyById(
        keyId,
        {
          ...currentKeyState,
          meta: {
            ...currentKeyState.meta,
            updatedByPerson,
          },
        },
        accessInfo,
      );
    } catch (error) {
      return this.responseError(res, error, error.httpStatusCode, error.details);
    }

    this.responseThatAccepted(res);
  }

  /**
   * Export xlsx.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async exportXlsx(req, res) {
    const paramsData = matchedData(req, { locations: ['params'] });
    const { id: registerId, keyId } = paramsData;
    let register;

    try {
      register = await this.registerBusiness.exportXlsx({ res, registerId, keyId });
      if (!register) {
        return this.responseError(res, 'Not found.', 404);
      }
    } catch (error) {
      return this.responseError(res, error);
    }
  }

  /**
   * Reindex by key ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async reindexByKeyId(req, res) {
    const { key_id: keyId } = matchedData(req, { locations: ['params'] });
    let response;
    try {
      response = await this.registerBusiness.reindexByKeyId(keyId);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, response);
  }

  /**
   * After handlers reindex by key ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async afterHandlersReindexByKeyId(req, res) {
    const { key_id: keyId } = matchedData(req, { locations: ['params'] });
    const data = matchedData(req, { locations: ['body'] });
    let response;
    try {
      response = await this.registerBusiness.afterHandlersReindexByKeyId(keyId, data);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, response);
  }
}

module.exports = RegisterController;
