import { matchedData } from 'express-validator';
import _ from 'lodash';
import { IdApiClient, getIdApiClient } from '@liquio/back-core';

import { Controller } from './controller';
import { MassMessagesMailingBusiness } from '../businesses/mass_messages_mailing';

/**
 * Mass messages mailing controller.
 */
export class MassMessagesMailingController extends Controller {
  private static singleton: MassMessagesMailingController;

  private massMessagesMailingBusiness: MassMessagesMailingBusiness;
  private idApiClient: IdApiClient;

  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!MassMessagesMailingController.singleton) {
      super(config);

      this.massMessagesMailingBusiness = new MassMessagesMailingBusiness(config);
      this.idApiClient = getIdApiClient();
      MassMessagesMailingController.singleton = this;
    }
    return MassMessagesMailingController.singleton;
  }

  /**
   * Send.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async send(req, res) {
    const { emails_list: emailsList = [], user_ids_list: userIdsList = [], subject, full_text: fullText } = matchedData(req, { locations: ['body'] });

    if (!emailsList?.length && !userIdsList?.length) {
      const error = new Error('One of params emails_list or user_ids_list must be passed and must be not empty array.');
      return this.responseError(res, error);
    }

    const emailPattern = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$/;
    if (!emailsList?.every((email) => emailPattern.test(email))) {
      const error = new Error('Param emails_list must contains valid emails only.');
      return this.responseError(res, error);
    }

    if (!userIdsList.every((userId) => userId.indexOf('@') === -1 && userId.length === 24)) {
      const error = new Error('Param user_ids_list must contains valid user ids only.');
      return this.responseError(res, error);
    }

    if (_.uniq(userIdsList).length !== userIdsList.length) {
      const error = new Error('All user ids must be unique.');
      return this.responseError(res, error);
    }
    if (_.uniq(emailsList).length !== emailsList.length) {
      const error = new Error('All emails must be unique.');
      return this.responseError(res, error);
    }

    const { subjectMaxLength = 500, fullTextMaxLength = 50000 } = this.config.mass_messages_mailing;
    const subjectLength = subject.length;
    const fullTextLength = fullText.length;

    if (subjectLength > subjectMaxLength) {
      const error = new Error(`Subject length is exceeded. Subject max length is ${subjectMaxLength} symbols but got ${subjectLength} symbols.`);
      return this.responseError(res, error);
    }

    if (fullTextLength > fullTextMaxLength) {
      const error = new Error(
        `Full text length is exceeded. Full text max length is ${fullTextMaxLength} symbols but got ${fullTextLength} symbols.`,
      );
      return this.responseError(res, error);
    }

    let responseByUserIds;
    let responseByUserEmail;
    try {
      responseByUserIds = await this.idApiClient.getUsersByIds(userIdsList, { withPrivateProps: false, briefInfo: true });
      if (responseByUserIds.length < userIdsList.length) {
        const existingUserIds = responseByUserIds.map(({ userId }) => userId);
        const notExistingUserIds = userIdsList.filter((userId) => !existingUserIds.includes(userId));
        const error = new Error(`Passed not existing userIds: ${notExistingUserIds.join(', ')}`);
        return this.responseError(res, error);
      }

      responseByUserEmail = (await Promise.all(emailsList.map((email) => this.idApiClient.getUsers({ email, limit: emailsList.length, offset: 0 }))))
        .map((users) => users[0])
        .filter(Boolean);
    } catch (error) {
      return this.responseError(res, error);
    }
    if (responseByUserEmail.length < emailsList.length) {
      const existingUserEmails = responseByUserEmail.map(({ email }) => email);
      const notExistingUserEmails = emailsList.filter((email) => !existingUserEmails.includes(email));
      const error = new Error(`Passed not existing user emails: ${notExistingUserEmails.join(', ')}`);
      return this.responseError(res, error);
    }

    const initiatorId = req.authUserId;

    let sendingResult;
    try {
      sendingResult = await this.massMessagesMailingBusiness.sendByEmailsAndUserIds({ initiatorId, emailsList, userIdsList, subject, fullText });
    } catch (error) {
      return this.responseError(res, error);
    }
    this.responseData(res, sendingResult);
  }

  /**
   * Get list with pagination.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getListWithPagination(req, res) {
    const queryData = matchedData(req, { locations: ['query'] });
    const { sort = {}, filters = {}, page, count } = queryData;

    let massMessagesMailing;
    try {
      massMessagesMailing = await this.massMessagesMailingBusiness.getListWithPagination({
        sort,
        filters,
        currentPage: page,
        perPage: count,
      });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, massMessagesMailing, true);
  }
}
