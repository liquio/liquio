import { Entity } from './entity';

interface SignatureRemovalHistoryEntityOptions {
  id: number;
  signatureId: number;
  signatureCreatedBy: string;
  signatureCreatedAt: Date;
  signatureUpdatedAt: Date;
  p7s: string;
  fileName: string;
  signatureType: string;
  documentId: number;
  workflowId: number;
  userId: string;
  userName: string;
  createdAt: Date;
}

/**
 * Document signature removal history entity.
 */
export class SignatureRemovalHistoryEntity extends Entity<SignatureRemovalHistoryEntityOptions> {}

export interface SignatureRemovalHistoryEntity extends SignatureRemovalHistoryEntityOptions {}
