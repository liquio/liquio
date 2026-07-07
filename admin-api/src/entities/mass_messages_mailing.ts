import { Entity } from './entity';

interface MassMessagesMailingEntityOptions {
  /** ID. */
  id: string;
  /** Initiator user ID. */
  initiatorId?: string;
  /** List of emails to send. */
  emailsList: string[];
  /** List of user IDs to send. */
  userIdsList: string[];
  /** Subject of message. */
  subject: string;
  /** Full text (body) of message. */
  fullText: string;
  /** Response of sending messages by emails. */
  responseByEmails: object;
  /** Response of sending messages by user IDs. */
  responseByUserIds: object;
  /** Is finished. */
  isFinished: boolean;
  /** Created at. */
  createdAt: Date;
  /** Updated at. */
  updatedAt: Date;
}

/**
 * Mass messages mailing entity.
 */
export class MassMessagesMailingEntity extends Entity<MassMessagesMailingEntityOptions> { }

export interface MassMessagesMailingEntity extends MassMessagesMailingEntityOptions { }

