import { Entity } from './entity';

/**
 * Access history entity.
 */
type AccessHistoryOperationType =
  | 'added-to-head-unit'
  | 'added-to-member-unit'
  | 'deleted-from-head-unit'
  | 'deleted-from-member-unit'
  | 'added-to-admin'
  | 'deleted-from-admin';

interface AccessHistoryEntityOptions {
  /** ID. */
  id: string;
  /** User ID. */
  userId: string;
  /** User name. */
  userName: string;
  /** Ipn. */
  ipn: string;
  /** Operation type. */
  operationType: AccessHistoryOperationType;
  /** Unit ID. */
  unitId: number;
  /** Unit name. */
  unitName: string;
  /** Init user ID. */
  initUserId: string;
  /** Init user name. */
  initUserName: string;
  /** Init ipn. */
  initIpn: string;
  /** Init workflow ID. */
  initWorkflowId?: string;
  /** Init workflow name. */
  initWorkflowName?: string;
  /** Created at. */
  createdAt: Date;
  /** Updated at. */
  updatedAt: Date;
}

/**
 * Access history entity.
 */
export class AccessHistoryEntity extends Entity<AccessHistoryEntityOptions> {
  getFilterProperties(): (keyof AccessHistoryEntityOptions)[] {
    return [
      'id',
      'userId',
      'userName',
      'ipn',
      'operationType',
      'unitId',
      'unitName',
      'initUserId',
      'initUserName',
      'initIpn',
      'initWorkflowId',
      'initWorkflowName',
      'createdAt',
      'updatedAt',
    ];
  }

  getFilterPropertiesBrief(): (keyof AccessHistoryEntityOptions)[] {
    return this.getFilterProperties();
  }
}

export interface AccessHistoryEntity extends AccessHistoryEntityOptions {}