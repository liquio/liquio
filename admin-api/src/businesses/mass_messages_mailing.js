const NotifierService = require('../services/notifier');

/**
 * Mass messages mailing business.
 */
class MassMessagesMailingBusiness {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!MassMessagesMailingBusiness.singleton) {
      this.config = config;
      this.notifierService = new NotifierService(config.notifier);
      MassMessagesMailingBusiness.singleton = this;
    }

    // Return singleton.
    return MassMessagesMailingBusiness.singleton;
  }

  /**
   * Send message to users by emails and/or user ids.
   * @param {object} options Options.
   */
  async sendByEmailsAndUserIds({ emailsList, userIdsList, subject, fullText, initiatorId }) {
    const createModelResponse = await models.massMessagesMailing.create({ initiatorId, emailsList, userIdsList, subject, fullText });

    let sendMessageByEmailsResponse;
    if (emailsList.length) {
      try {
        sendMessageByEmailsResponse = await this.notifierService.sendMessageByEmails({ emailsList, subject, fullText });
        await models.massMessagesMailing.update(createModelResponse.id, {
          responseByEmails: sendMessageByEmailsResponse,
        });
      } catch (error) {
        log.save('send-message-by-emails-notify-error', error.message);
        throw error;
      }
    }

    let sendMessageByUserIdsResponse;
    if (userIdsList.length) {
      try {
        sendMessageByUserIdsResponse = await this.notifierService.sendMessageByUserIds({ userIdsList, subject, fullText });
        await models.massMessagesMailing.update(createModelResponse.id, {
          responseByUserIds: sendMessageByUserIdsResponse,
        });
      } catch (error) {
        log.save('send-message-by-emails-notify-error', error.message);
        throw error;
      }
    }
    const finishModelResponse = await models.massMessagesMailing.update(createModelResponse.id, {
      isFinished: true,
    });

    return finishModelResponse;
  }

  /**
   * Get units with pagination.
   * @returns {Promise<MassMessagesMailingEntity[]>}
   */
  async getListWithPagination(params) {
    return await models.massMessagesMailing.getListWithPagination(params);
  }
}

module.exports = MassMessagesMailingBusiness;
