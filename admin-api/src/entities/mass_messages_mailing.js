const Entity = require('./entity');

/**
 * Mass messages mailing entity.
 */
class MassMessagesMailingEntity extends Entity {
  /**
   * Constructor.
   * @param {object} options Options.
   * @param {string} options.id ID.
   * @param {string} [options.initiatorId] Initiator user ID.
   * @param {[string]} options.emailsList List of emails to send.
   * @param {[string]} options.userIdsList List of user IDs to send.
   * @param {string} options.subject Subject of message.
   * @param {string} options.fullText Full text (body) of message.
   * @param {object} options.responseByEmails Response of sending messages by emails.
   * @param {object} options.responseByUserIds Response of sending messages by user IDs.
   * @param {string} options.isFinished Is finished.
   * @param {string} options.createdAt Created at.
   * @param {string} options.updatedAt Updated at.
   */
  constructor({
    id,
    initiatorId,
    emailsList,
    userIdsList,
    subject,
    fullText,
    responseByEmails,
    responseByUserIds,
    isFinished,
    createdAt,
    updatedAt,
  }) {
    super();

    this.id = id;
    this.initiatorId = initiatorId;
    this.emailsList = emailsList;
    this.userIdsList = userIdsList;
    this.subject = subject;
    this.fullText = fullText;
    this.responseByEmails = responseByEmails;
    this.responseByUserIds = responseByUserIds;
    this.isFinished = isFinished;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = MassMessagesMailingEntity;
