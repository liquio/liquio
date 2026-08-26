import { Entity } from './entity';

/**
 * Share access entity.
 */
export class ShareAccessEntity extends Entity {
  id: any;
  shareFrom: any;
  shareTo: any;
  accessType: any;
  accessDetails: any;
  createdAt: any;
  updatedAt: any;

  /**
   * Share access entity constructor.
   * @param {object} options Share access object.
   * @param {string} options.id ID.
   * @param {object} options.shareFrom Share from.
   * @param {object} options.shareTo Share to.
   * @param {'create-workflow'|'edit-task'|'commit-task'} options.accessType Access type.
   * @param {object} options.accessDetails Access details.
   * @param {Date} options.createdAt Created at.
   * @param {Date} options.updatedAt Updated at.
   */
  constructor({ id, shareFrom, shareTo, accessType, accessDetails, createdAt, updatedAt }: any) {
    super();

    this.id = id;
    this.shareFrom = shareFrom;
    this.shareTo = shareTo;
    this.accessType = accessType;
    this.accessDetails = accessDetails;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
