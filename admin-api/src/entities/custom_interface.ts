import { Entity } from './entity';

interface CustomInterfaceEntityOptions {
  /** ID. */
  id: number;
  /** Name. */
  name: string;
  /** Route. */
  route: string;
  /** Is active. */
  isActive: boolean;
  /** Interface schema. */
  interfaceSchema: string;
  /** Units. */
  units: number[];
  /** Created at. */
  createdAt: Date;
  /** Updated at. */
  updatedAt: Date;
}

/**
 * Custom interface entity.
 */
export class CustomInterfaceEntity extends Entity<CustomInterfaceEntityOptions> { }

export interface CustomInterfaceEntity extends CustomInterfaceEntityOptions { }