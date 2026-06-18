import { Entity } from './entity';

interface LocalizationTextEntityOptions {
  /** Localization language code. */
  localizationLanguageCode: string;
  /** Key. */
  key: string;
  /** Value. */
  value: string;
  /** Created at. */
  createdAt: Date;
  /** Updated at. */
  updatedAt: Date;
}

/**
 * Localization text entity.
 */
export class LocalizationTextEntity extends Entity<LocalizationTextEntityOptions> { }

export interface LocalizationTextEntityCreateOptions extends LocalizationTextEntityOptions { }

