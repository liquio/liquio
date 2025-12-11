const Controller = require('./controller');
const Notifier = require('../lib/notifier');

/**
 * Message controller.
 */
class MessageController extends Controller {
  constructor() {
    // Define singleton.
    if (!MessageController.singleton) {
      super();
      this.notifier = new Notifier();
      MessageController.singleton = this;
    }
    return MessageController.singleton;
  }

  /**
   * Get all.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getAll(req, res) {
    const accessToken = this.getRequestUserAccessToken(req);
    const eventId = req.query.event_id && parseInt(req.query.event_id);
    const queryParams = req.query;

    let messages;
    try {
      messages = await this.notifier.getMessages(accessToken, eventId, queryParams);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, messages, undefined, true);
  }

  /**
   * Set message state is read.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async setMessageStateIsRead(req, res) {
    const accessToken = this.getRequestUserAccessToken(req);
    const messageId = req.body.messageId;

    let result;
    try {
      result = await this.notifier.setMessageStateIsRead(accessToken, messageId);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, result);
  }

  /**
   * Get count unread messages.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getCountUnreadMessages(req, res) {
    const userId = this.getRequestUserId(req);

    let result;
    try {
      result = await this.notifier.getCountUnreadMessages(undefined, userId);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, result);
  }

  /**
   * Decrypt.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async decrypt(req, res) {
    // Define params.
    const accessToken = this.getRequestUserAccessToken(req);
    const { id: rawMessageId } = req.params;
    const messageId = parseInt(rawMessageId);
    const { decryptedBase64 } = req.body;

    // Save decrypted message data.
    let result;
    try {
      result = await this.notifier.decrypt(accessToken, messageId, decryptedBase64);
    } catch (error) {
      return this.responseError(res, error);
    }

    // Response.
    this.responseData(res, result);
  }

  /**
   * Get important messages.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getImportantMessages(req, res) {
    // Define params.
    const accessToken = this.getRequestUserAccessToken(req);

    let result;
    try {
      result = await this.notifier.getImportantMessages(accessToken);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, result);
  }

  /**
   * Hide important message.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async hideImportantMessage(req, res) {
    // Define params.
    const accessToken = this.getRequestUserAccessToken(req);
    const { id: rawMessageId } = req.params;
    const messageId = parseInt(rawMessageId);

    let result;
    try {
      result = await this.notifier.hideImportantMessage(accessToken, messageId);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, result);
  }
}

module.exports = MessageController;
