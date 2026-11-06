import { Entity } from './entity';

interface ProxyItemEntityOptions {
  /** ID. */
  id: number;
  /** Name. */
  name: string;
  /** JSON data. */
  data: object;
  /** Access units list. */
  accessUnits: number[];
  /** Created at. */
  createdAt: Date;
  /** Updated at. */
  updatedAt: Date;
}

/**
 * Proxy item entity.
 */
export class ProxyItemEntity extends Entity<ProxyItemEntityOptions> {
  getFilterProperties(): (keyof ProxyItemEntityOptions)[] {
    return ['id', 'name', 'data', 'accessUnits', 'createdAt', 'updatedAt'];
  }

  getFilterPropertiesBrief(): (keyof ProxyItemEntityOptions)[] {
    return ['id', 'name', 'data', 'accessUnits', 'createdAt', 'updatedAt'];
  }
}

export interface ProxyItemEntity extends ProxyItemEntityOptions {}
