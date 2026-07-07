import { Entity } from './entity';

interface AdditionalDataSignatureEntityOptions {
  /** ID. */
  id: string;
  /** Document ID. */
  documentId: string;
  /** Signed data. */
  data: string;
  /** Signature. */
  signature: string;
  /** Certificate. */
  certificate: string;
  /** Crypt certificate. */
  cryptCertificate: string;
  /** Encrypted data. */
  encryptedData: string;
  /** Encrypted data certificate. */
  encryptedDataCertificate: string;
  /** Created by. */
  createdBy: string;
  /** Meta. */
  meta: object;
  /** Created at. */
  createdAt: Date;
  /** Updated at. */
  updatedAt: Date;
}

/**
 * Additional data signature entity.
 */
export class AdditionalDataSignatureEntity extends Entity<AdditionalDataSignatureEntityOptions> {
  /**
   * Get filter properties.
   * @returns {string[]} Filter properties list.
   */
  getFilterProperties(): (keyof AdditionalDataSignatureEntityOptions)[] {
    return [
      'id',
      'documentId',
      'data',
      'signature',
      'certificate',
      'cryptCertificate',
      'encryptedData',
      'encryptedDataCertificate',
      'createdBy',
      'createdAt',
      'updatedAt',
    ];
  }

  /**
   * Get filter properties brief.
   * @returns {string[]} Filter properties brief list.
   */
  getFilterPropertiesBrief(): (keyof AdditionalDataSignatureEntityOptions)[] {
    return this.getFilterProperties();
  }
}

export interface AdditionalDataSignatureEntity extends AdditionalDataSignatureEntityOptions { }
