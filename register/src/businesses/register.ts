import Sequelize from 'sequelize';

import Business from './business';
import RegisterModel from '../models/register';
import KeyModel from '../models/key';
import RecordModel from '../models/record';

const ADDRESS_REGION_KEY_ID = 374;
const ADDRESS_CITY_KEY_ID = 375;
const ADDRESS_STREET_KEY_ID = 376;

// Constants.
const ERRORS = {
  default: {
    message: 'Error while processing operation.',
    code: 500
  },
  'export-register-id-error': {
    message: 'Bad register ID.',
    code: 400
  },
  'export-register-find-error': {
    message: 'Not found',
    code: 404
  },
  'export-register-existence-error': {
    message: 'Not found',
    code: 404
  },
  'export-register-keys-error': {
    message: "Can't fetch keys.",
    code: 500
  },
  'export-register-records-error': {
    message: "Can't fetch records.",
    code: 500
  },
  'export-register-max-limit-reached': {
    message: 'Max export limit reached.',
    code: 403
  },
  'import-register-empty-error': {
    message: 'Empty body.',
    code: 400
  },
  'import-register-exist': {
    message: 'Register already exists.',
    code: 400
  },
  'import-register-id-error': {
    message: 'Invalid id in uri/body.',
    code: 400
  },
  'import-register-not-found-error': {
    message: 'Not found.',
    code: 404
  },
  'import-register-create-or-update-key-error': {
    message: 'Can not create or update key.',
    code: 400
  },
  'import-register-record-register-id-error': {
    message: 'Bad record register ID.',
    code: 400
  },
  'import-register-record-key-id-error': {
    message: 'Bad record key ID.',
    code: 400
  },
  'import-register-create-or-update-record-error': {
    message: 'Can not create or update record.',
    code: 400
  },
  'import-register-cycle-keys-parents': {
    message: 'Can`t import - maybe cycled keys parents.',
    code: 400
  },
  'import-register-create-record-error': {
    message: 'Can`t import - maybe record exists in other key.',
    code: 400
  }
};

/**
 * Register business.
 */
export default class RegisterBusiness extends Business {
  static singleton: RegisterBusiness;

  registerModel: RegisterModel;
  keyModel: KeyModel;
  recordModel: RecordModel;

  /**
   * RegisterBusiness constructor.
   * @param {object} config Config object.
   * @return {RegisterBusiness}
   */
  constructor(config) {
    // Define singleton.
    if (!RegisterBusiness.singleton) {
      super(config);
      this.registerModel = RegisterModel.getInstance();
      this.keyModel = KeyModel.getInstance();
      this.recordModel = RecordModel.getInstance();
      RegisterBusiness.singleton = this;
    }
    return RegisterBusiness.singleton;
  }

  /**
   * If it needed to import keys and records.
   * @param {boolean} doRewriteKeysSchema
   * @param {boolean} doClearOriginal
   * @param {boolean} doImportRecords
   * @return boolean
   */
  needImport(doRewriteKeysSchema, doClearOriginal, doImportRecords) {
    return doRewriteKeysSchema || doImportRecords || doClearOriginal;
  }

  /**
   * Check if registerId valid
   * @param {number} pathRegisterId
   * @param {number} dataRegisterId
   * @return {boolean}
   */
  isValidId(pathRegisterId, dataRegisterId) {
    return pathRegisterId && dataRegisterId && pathRegisterId === dataRegisterId;
  }

  /**
   * Get all register keys
   * @param {number} registerId
   * @return {Promise<KeyEntity[] | Array>}
   * @throws Error
   */
  async getExistingRegisterKeys(registerId, ids = []) {
    const originalKeysResult = await this.keyModel.getAll({
      offset: 0,
      limit: null,
      filter: {
        register_id: registerId,
        id: ids
      }
    });

    return originalKeysResult.data || [];
  }

  /**
   * Get all register key records
   * @param {number} registerId
   * @param {number} keyId
   * @return {Promise<RecordEntity[] | Array>}
   * @throws Error
   */
  async getExistingRegisterKeyRecords(registerId, keyId) {
    const recordsModelResponse = await this.recordModel.getAll({
      offset: 0,
      limit: null,
      filter: {
        register_id: registerId,
        key_id: keyId
      }
    });

    return recordsModelResponse.data || [];
  }

  /**
   * @param {string} key
   * @param {Error | Object} error
   * @param {Object} options
   * @return {Error | Object}
   */
  getErrorAndLogIt(key: string, error = {}, options?: object) {
    const errorObject = ERRORS[key] || ERRORS['default'];

    // Set from original.
    if (error && error['message']) {
      if (!(error['message'].indexOf('notNull Violation') >= 0 || error['message'].indexOf('Validation error') >= 0)) {
        errorObject.message += ' ' + error['message'];
      } else {
        errorObject.original_message = error['message'];
        errorObject.original_errors = error['errors'];
      }
    }

    // Append options.
    errorObject.options = options;

    // Log it.
    this.log.save(key, errorObject);

    return errorObject;
  }

  /**
   * @param {Object} changes
   * @param {string} action
   * @param {number} keyId
   * @param {number} recordId
   * @return {Object}
   */

  changes(changes, action, keyId, recordId = '') {
    if (!changes || !changes.hasOwnProperty('created')) {
      changes = {
        created: { records: {}, keys: [] },
        updated: { records: {}, keys: [] },
        deleted: { records: {} }
      };
    }

    if (recordId !== '') {
      if (!changes[action].records[keyId]) changes[action].records[keyId] = [];
      changes[action].records[keyId].push(recordId);
    } else {
      if (!changes[action].keys.includes(keyId)) changes[action].keys.push(keyId);
    }

    return changes;
  }

  // INFO: CUSTOM

  /**
   * Get region id by region or special status city name.
   * @param regionName
   * @return {Promise<[number]>}
   */
  async getRegionId(regionName) {
    let regionIds = [];
    const result = await this.recordModel.model.sequelize.query(
      `
        SELECT data->>'id' as region_id
        FROM records
        WHERE key_id = :addressRegionKeyId
          AND data->>'name' like '%' || :regionName || '%'
        LIMIT 10;
      `,
      {
        type: Sequelize.QueryTypes.SELECT,
        replacements: { regionName, addressRegionKeyId: ADDRESS_REGION_KEY_ID }
      }
    );

    if (result && result.length > 0) {
      regionIds = result.map((element) => element.region_id);
    }

    return regionIds;
  }

  /**
   * Get city id by region id, district and city names.
   * @param regionId
   * @param districtName
   * @param cityName
   * @return {Promise<[number]>}
   */
  async getCityId(regionId, districtName, cityName) {
    let cityIds = [];
    const result = await this.recordModel.model.sequelize.query(
      `
        SELECT data->>'id' as city_id
        FROM records
        WHERE key_id = :addressCityKeyId
          AND data->>'regionId' = :regionId
          AND data->>'district' like '%' || :districtName || '%'
          AND data->>'name' like '%' || :cityName || '%'
        LIMIT 10;
      `,
      {
        type: Sequelize.QueryTypes.SELECT,
        replacements: { regionId, districtName, cityName, addressCityKeyId: ADDRESS_CITY_KEY_ID }
      }
    );

    if (result && result.length > 0) {
      cityIds = result.map((element) => element.city_id);
    }

    return cityIds;
  }

  /**
   * Get post code by cityId, streetName and buildingNumber.
   * @param cityId
   * @param streetName
   * @param buildingNumber
   * @return {Promise<[number]>}
   */
  async getPostalCode(cityId, streetName, buildingNumber) {
    let postalCodes = [];
    const result = await this.recordModel.model.sequelize.query(
      `
        SELECT buildings::json ->> 'postalCode' as postal_code
        FROM (
               SELECT jsonb_array_elements(data -> 'buildings') as buildings
               FROM records
               WHERE key_id = :addressStreetKeyId
                 AND data->>'cityId' = :cityId
                 AND data->>'name' like '%' || :streetName || '%'
             ) all_buildings
        WHERE buildings::json ->> 'number' = :buildingNumber
        LIMIT 10;`,
      {
        type: Sequelize.QueryTypes.SELECT,
        replacements: { cityId, streetName, buildingNumber, addressStreetKeyId: ADDRESS_STREET_KEY_ID }
      }
    );

    if (result && result.length > 0) {
      postalCodes = result.map((element) => element.postal_code);
    }

    return postalCodes;
  }
}
