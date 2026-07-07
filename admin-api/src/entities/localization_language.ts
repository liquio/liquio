import { Entity } from './entity';

interface LocalizationLanguageEntityOptions {
  /** Code. */
  code: string;
  /** Name. */
  name: string;
  /** isActive. */
  isActive: boolean;
  /** meta. */
  meta: object;
  /** Created at. */
  createdAt: Date;
  /** Updated at. */
  updatedAt: Date;
}

/**
 * Localization language entity.
 */
export class LocalizationLanguageEntity extends Entity<LocalizationLanguageEntityOptions> { }

export interface LocalizationLanguageEntity extends LocalizationLanguageEntityOptions { }
