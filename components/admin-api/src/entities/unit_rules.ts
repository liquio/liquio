import { Entity } from './entity';

interface UnitRulesEntityOptions {
  /** User ID. */
  type: string;
  /** Document ID. */
  ruleSchema: object;
  /** Created at. */
  createdAt: Date;
  /** Updated at. */
  updatedAt: Date;
}

/**
 * Unit rules entity.
 */
export class UnitRulesEntity extends Entity<UnitRulesEntityOptions> {}

export interface UnitRulesEntity extends UnitRulesEntityOptions {}
