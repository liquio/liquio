import { Entity } from './entity';

interface GatewayTypeEntityOptions {
  /** ID. */
  id: number;
  /** Name. */
  name: string;
  /** Created at. */
  createdAt: Date;
  /** Updated at. */
  updatedAt: Date;
}

// Types.
const TYPES = {
  Parallel: 'parallel',
  Exclusive: 'exclusive',
  Inclusive: 'inclusive',
};

/**
 * Gateway type entity.
 */
export class GatewayTypeEntity extends Entity<GatewayTypeEntityOptions> {
  /**
   * Types.
   * @returns {typeof TYPES}
   */
  static get Types() {
    return TYPES;
  }

  /**
   * Is Parallel indicator.
   * @returns {boolean}
   */
  get isParallel() {
    return this.name === GatewayTypeEntity.Types.Parallel;
  }

  /**
   * Is Exclusive indicator.
   * @returns {boolean}
   */
  get isExclusive() {
    return this.name === GatewayTypeEntity.Types.Exclusive;
  }

  /**
   * Is Inclusive indicator.
   * @returns {boolean}
   */
  get isInclusive() {
    return this.name === GatewayTypeEntity.Types.Inclusive;
  }
}

export interface GatewayTypeEntity extends GatewayTypeEntityOptions {}
