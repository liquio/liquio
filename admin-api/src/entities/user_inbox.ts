import { Entity } from './entity';

interface UserInboxEntityOptions {
  /** ID. */
  id: number;
  /** User ID. */
  userId: string;
  /** Document ID. */
  documentId: string;
  /** Name. */
  name: string;
  /** Number. */
  number: string;
  /** Is read indicator. */
  isRead: boolean;
  /** Created at. */
  createdAt: Date;
  /** Updated at. */
  updatedAt: Date;
}

/**
 * User inbox entity.
 */
export class UserInboxEntity extends Entity<UserInboxEntityOptions> {

  /**
   * Get filter properties.
   * @returns {string[]} Filter properties.
   */
  getFilterProperties(): (keyof UserInboxEntityOptions)[] {
    return ['id', 'userId', 'documentId', 'name', 'number', 'isRead', 'createdAt', 'updatedAt'];
  }

  /**
   * Get filter properties brief.
   * @returns {string[]} Filter properties brief.
   */
  getFilterPropertiesBrief(): (keyof UserInboxEntityOptions)[] {
    return this.getFilterProperties();
  }
}
