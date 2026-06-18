const { matchedData } = require('express-validator');
const _ = require('lodash');

const Controller = require('./controller');
const MassMessagesMailingBussiness = require('../businesses/mass_messages_mailing');
const AuthService = require('../services/auth');

/**
 * Mass messages mailing controller.
 */
class MassMessagesMailingController extends Controller {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!MassMessagesMailingController.singleton) {
      super(config);

      this.massMessagesMailingBusiness = new MassMessagesMailingBussiness(config);
      this.authService = new AuthService(config.auth);
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

    const responseByUserIds = await this.authService.getUsersByIds(userIdsList, false, true);
    if (responseByUserIds.length < userIdsList.length) {
      const existingUserIds = responseByUserIds.map(({ userId }) => userId);
      const notExistingUserIds = userIdsList.filter((userId) => !existingUserIds.includes(userId));
      const error = new Error(`Passed not existing userIds: ${notExistingUserIds.join(', ')}`);
      return this.responseError(res, error);
    }

    const responseByUserEmail = (
      await Promise.all(emailsList.map((email) => this.authService.getUsers({ email, limit: emailsList.length, offset: 0 })))
    )
      .map(({ body }) => body[0])
      .filter(Boolean);
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

module.exports = MassMessagesMailingController;
