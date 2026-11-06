import { Entity } from './entity';

interface UIFilterEntityOptions {
  /** ID. */
  id: number;
  /** Name. */
  name: string;
  /** Filter. */
  filter: string;
  /** Is active. */
  isActive: boolean;
  /** Created at. */
  createdAt: Date;
  /** Updated at. */
  updatedAt: Date;
}

/**
 * UI Filter entity.
 */
export class UIFilterEntity extends Entity<UIFilterEntityOptions> {}
