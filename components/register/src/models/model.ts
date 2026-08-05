import { Op, Sequelize } from 'sequelize';

export interface ModelFilter {
  created_at?: any;
  updated_at?: any;
  data?: any;
}

export interface ModelDatesFilter {
  createdFrom?: string;
  createdTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
  residentshipDateFrom?: string;
  residentshipDateTo?: string;
  residentshipStatusDateFrom?: string;
  residentshipStatusDateTo?: string;
  dataDateFrom?: { [key: string]: string };
  dataDateTo?: { [key: string]: string };
}

/**
 * Model.
 */
export default class Model {
  protected db: Sequelize;
  protected config: any;
  protected models: any;
  public model: any;

  /**
   * Model constructor.
   * @param {object} config Config.
   * @param {{models}} options Options.
   */
  constructor(config?: any, options?: { models: any }) {
    this.db = global.db;
    this.config = config;
    this.models = options.models;
  }

  /**
   * Add dates filter.
   * @param {object} filter Filter object.
   * @param {object} datesFilterToAppend Dates filter to append.
   * @param {string} [datesFilterToAppend.createdFrom] Created from.
   * @param {string} [datesFilterToAppend.createdTo] Created to.
   * @param {string} [datesFilterToAppend.updatedFrom] Updated from.
   * @param {string} [datesFilterToAppend.updatedTo] Updated to.
   * @param {string} [datesFilterToAppend.residentshipDateFrom] Residentship date from. Deprecated.
   * @param {string} [datesFilterToAppend.residentshipDateTo] Residentship date to. Deprecated.
   * @param {string} [datesFilterToAppend.residentshipStatusDateFrom] Residentship status date from. Deprecated.
   * @param {string} [datesFilterToAppend.residentshipStatusDateTo] Residentship status date to. Deprecated.
   * @param {object} [datesFilterToAppend.dataDateFrom] Data date from.
   * @param {object} [datesFilterToAppend.dataDateTo] Data date to.
   */
  addDatesFilter(filter: ModelFilter = {}, dateFilers: ModelDatesFilter = {}) {
    const {
      createdFrom,
      createdTo,
      updatedFrom,
      updatedTo,
      residentshipDateFrom,
      residentshipDateTo,
      residentshipStatusDateFrom,
      residentshipStatusDateTo,
      dataDateFrom,
      dataDateTo
    } = dateFilers;

    // Prepare containers for filters.
    if (createdFrom || createdTo) {
      filter.created_at = {};
    }
    if (updatedFrom || updatedTo) {
      filter.updated_at = {};
    }
    if (residentshipStatusDateFrom || residentshipStatusDateTo) {
      filter.data.residentshipStatusDate = {};
    }
    if (residentshipDateFrom || residentshipDateTo) {
      filter.data.createdAt = {};
    }

    // Append dates filter.
    if (createdFrom) {
      filter.created_at[Op.gte] = new Date(createdFrom);
    }
    if (createdTo) {
      filter.created_at[Op.lte] = new Date(createdTo);
    }
    if (updatedFrom) {
      filter.updated_at[Op.gte] = new Date(updatedFrom);
    }
    if (updatedTo) {
      filter.updated_at[Op.lte] = new Date(updatedTo);
    }
    if (residentshipStatusDateFrom) {
      filter.data.residentshipStatusDate[Op.gte] = new Date(residentshipStatusDateFrom);
    }
    if (residentshipStatusDateTo) {
      filter.data.residentshipStatusDate[Op.lte] = new Date(residentshipStatusDateTo);
    }
    if (residentshipDateFrom) {
      filter.data.createdAt[Op.gte] = new Date(residentshipDateFrom);
    }
    if (residentshipDateTo) {
      filter.data.createdAt[Op.lte] = new Date(residentshipDateTo);
    }
    if (dataDateFrom) {
      for (const key in dataDateFrom) {
        filter.data[key] = filter.data[key] || {};
        filter.data[key][Op.gte] = new Date(dataDateFrom[key]);
      }
    }
    if (dataDateTo) {
      for (const key in dataDateTo) {
        filter.data[key] = filter.data[key] || {};
        filter.data[key][Op.lte] = new Date(dataDateTo[key]);
      }
    }

    // Return filter object with appended dates filter.
    return filter;
  }

  // Remove undefined properties.
  removeUndefinedProperties(rawPreparedStructure: { [key: string]: any } = {}) {
    for (const property in rawPreparedStructure) {
      if (rawPreparedStructure[property] === undefined) {
        delete rawPreparedStructure[property];
      }
    }

    return rawPreparedStructure;
  }
}
