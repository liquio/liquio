import { NotifierService } from '../services/notifier';

/**
 * Mass messages mailing business.
 */
export class MassMessagesMailingBusiness {
  private static singleton: MassMessagesMailingBusiness;

  public config: object;
  public notifierService: NotifierService;

  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!MassMessagesMailingBusiness.singleton) {
      this.config = config;
      this.notifierService = new NotifierService();
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
    const createModelResponse = await global.models.massMessagesMailing.create({ initiatorId, emailsList, userIdsList, subject, fullText });

    let sendMessageByEmailsResponse;
    if (emailsList.length) {
      try {
        sendMessageByEmailsResponse = await this.notifierService.sendMessageByEmails({ emailsList, subject, fullText });
        await global.models.massMessagesMailing.update(createModelResponse.id, {
          responseByEmails: sendMessageByEmailsResponse,
        });
      } catch (error) {
        global.log.save('send-message-by-emails-notify-error', error.message);
        throw error;
      }
    }

    let sendMessageByUserIdsResponse;
    if (userIdsList.length) {
      try {
        sendMessageByUserIdsResponse = await this.notifierService.sendMessageByUserIds({ userIdsList, subject, fullText });
        await global.models.massMessagesMailing.update(createModelResponse.id, {
          responseByUserIds: sendMessageByUserIdsResponse,
        });
      } catch (error) {
        global.log.save('send-message-by-user-ids-notify-error', error.message);
        throw error;
      }
    }
    const finishModelResponse = await global.models.massMessagesMailing.update(createModelResponse.id, {
      isFinished: true,
    });

    return finishModelResponse;
  }

  /**
   * Get units with pagination.
   * @returns {Promise<MassMessagesMailingEntity[]>}
   */
  async getListWithPagination(params) {
    return await global.models.massMessagesMailing.getListWithPagination(params);
  }
}
