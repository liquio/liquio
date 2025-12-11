import Entity from './entity';
import HistoryEntity from './history';

// Constants.
const TYPES = {
  Blockchain: 'blockchain',
  Elastic: 'elastic',
  PLink: 'plink'
};

/**
 * Afterhandler entity.
 * @typedef {import('./history')} HistoryEntity
 */
export default class AfterhandlerEntity extends Entity {
  id: string;
  type: string;
  historyId: string;
  synced: boolean;
  hasError: boolean;
  errorMessage: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  history: HistoryEntity;

  /**
   * Constructor.
   * @param {object} raw Afterhandler RAW object.
   * @param {string} raw.id ID.
   * @param {string} raw.type Afterhandler type.
   * @param {string} raw.history_id History ID.
   * @param {boolean} raw.synced Synced.
   * @param {boolean} raw.has_error Has error.
   * @param {string} raw.error_message Error message.
   * @param {string} raw.created_by Created by.
   * @param {string} raw.updated_by Updated by.
   * @param {string} raw.created_at Created at.
   * @param {string} raw.updated_at Updated at.
   * @param {HistoryEntity} [raw.history] History entity.
   */
  constructor({ id, type, history_id, synced, has_error, error_message, created_by, updated_by, created_at, updated_at, history }) {
    super();

    this.id = id;
    this.type = type;
    this.historyId = history_id;
    this.synced = synced;
    this.hasError = has_error;
    this.errorMessage = error_message;
    this.createdBy = created_by;
    this.updatedBy = updated_by;
    this.createdAt = created_at;
    this.updatedAt = updated_at;
    this.history = history;
  }

  /**
   * Types.
   * @returns {TYPES} Afterhandler types.
   */
  static get Types() {
    return TYPES;
  }
}
