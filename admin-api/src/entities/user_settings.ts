import { Entity } from './entity';

interface UserSettingsEntityOptions {
  /** ID. */
  id: string;
  /** User ID. */
  userId: string;
  /** JSON data. */
  data: object;
  /** Created at. */
  createdAt: Date;
  /** Updated at. */
  updatedAt: Date;
}

/**
 * User settings entity.
 */
export class UserSettingsEntity extends Entity<UserSettingsEntityOptions> {
}

export interface UserSettingsEntity extends UserSettingsEntityOptions {}
