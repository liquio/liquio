const Sequelize = require('sequelize');
const Auth = require('../models/authServer');
const UserSubscribesModel = require('../models/user_subscribes');
const CommunicationModel = require('../models/communications');
const SettingsModel = require('../models/settings');
const EventsModel = require('../models/events');
const TemplatesModel = require('../models/templates');
const { MessangerModel } = require('../models/smsGate/messangerModel');
const CorezoidGate = require('../models/smsGate/corezoidModel');
const MailerModel = require('../models/emailGate/mailerModel');
const IncommingMessagesModel = require('../models/incomming_messages');
const ImportantMessagesModel = require('../models/important_messages');
const UsersMessagesModel = require('../models/users_messages');
const MessageCryptTypesModel = require('../models/message_crypt_types');
const { checkAuth, checkTestAuth } = require('./auth');
const axios = require('axios');
let Router = require('restify-router').Router;
let routerInstance = new Router();
const Subscribes = new UserSubscribesModel().UserSubscribes;
const Communication = new CommunicationModel().Communications;
const Settings = new SettingsModel().Settings;
const Events = new EventsModel().Events;
const Templates = new TemplatesModel().Templates;
const messangerGate = new MessangerModel();
const IncommingMessages = new IncommingMessagesModel().IncommingMessages;
const ImportantMessages = new ImportantMessagesModel().ImportantMessages;
const UsersMessages = new UsersMessagesModel().UsersMessages;
const MessageCryptTypes = new MessageCryptTypesModel().MessageCryptTypes;
const Corezoid = new CorezoidGate();
const NodeCache = require('node-cache');
const idxCache = new NodeCache({ stdTTL: 100, checkperiod: 120 });

// Constants.
const TEST_EMAIL = {
  SUBJECT: 'Test message',
  TEXT: 'Test message text.',
};
const TEST_SMS = {
  MESSAGE_TRANSLIT: 'Test message translit.',
};
const COMPLEX_MESSAGE_TRANSFER_CHANNELS_MAP = {
  sms: '2',
  push: '1',
  email: '3',
  registeredLetter: '4',
  valuableLetter: '5',
};
const COMPLEX_MESSAGE_TRANSFER_OPTIONS_MAP = {
  sms: 'sms',
  push: 'push',
  email: 'email',
  registeredLetter: 'postal',
  valuableLetter: 'postal',
};
const COMPLEX_MESSAGE_TRANSFER_TEXT_MAP = {
  sms: 'short',
  push: 'medium',
  email: 'large',
  registeredLetter: 'large',
  valuableLetter: 'large',
};
const COMPLEX_MESSAGE_TRANSFER_NORMALIZED_TEXT_MAP = {
  sms: 'normalizedShortText',
  push: 'normalizedMediumText',
  email: 'normalizedLargeText',
  registeredLetter: 'normalizedLargeText',
  valuableLetter: 'normalizedLargeText',
};
const TRANSFERS = ['sms', 'email', 'push'];
const OPTIONS = {
  general: {
    GUIDDocProfMSG: '4f9e396ce2338112e053590a010a2dc2',
    GUIDDocProfCase: '6f9e376ce23a4112e053590a010a2dc2',
    GUIDDocProfProceeding: '6f9e376ce23b4112e053590a010a2dc2',
    GUIDDocProfSession: '70420dfc4f047495e053590a010a91c0',
    GUIDKitSoftUser: '5b7563de34afb2c242b53bf2',
  },
};
const PAGINATION_START_FROM = 0;
const PAGINATION_TO = 100;
const HEADER_TOTAL_COUNT = 'X-Total';
const UNREAD_MESSAGE_VALUE = 0;
const READ_MESSAGE_VALUE = 1;
const SMS_CHANNEL = '2';

const Message = class extends Auth {
  constructor(server) {
    super();
    this.registerRoutes();
    return routerInstance.applyRoutes(server, '/message');
  }

  /**
   * Register routes.
   */
  registerRoutes() {
    // Test routes.
    routerInstance.post('/test/email', checkTestAuth, this.sendTestEmail.bind(this));
    routerInstance.post('/test/sms', checkTestAuth, this.sendTestSMS.bind(this));
    routerInstance.post('/test/user', checkTestAuth, this.sendTestUser.bind(this));
    routerInstance.post('/test/comlex_options', checkAuth, this.sendTestMessageByComplexOptions.bind(this));

    // Send messages routes.
    routerInstance.post('/usersList', checkAuth, this.sendMessageByUsersList.bind(this));
    routerInstance.post('/emailsList', checkAuth, this.sendMessageByEmailsList.bind(this));
    routerInstance.post('/phonesList', checkAuth, this.sendMessageByPhonesList.bind(this));
    routerInstance.post('/eventId', checkAuth, this.sendMessageByEventId.bind(this));
    routerInstance.post('/complex_options', checkAuth, this.sendMessageByComplexOptions.bind(this));
    routerInstance.post('/toAll', checkAuth, this.sendToAllUsers.bind(this));
    routerInstance.del('/toAll/:id', checkAuth, this.deleteMessagetoAll.bind(this));
    routerInstance.get('/toAll', checkAuth, this.getMessagesToAllUsers.bind(this));

    // Other routes.
    routerInstance.post('/', checkAuth, this.addMessage.bind(this));
    routerInstance.get('/', checkAuth, this.getMessages.bind(this));
    routerInstance.get('/senderErrorCallback', this.senderErrorCallack.bind(this));
    routerInstance.post('/sms/callback/', this.gmsuCallback.bind(this));
    routerInstance.put('/is_read', this.setIsReadProperty.bind(this));
    routerInstance.get('/unread', this.getUnreadUserMessagesCount.bind(this));
    routerInstance.get('/important', checkAuth, this.getImportantMessages.bind(this));
    routerInstance.put('/important/:id/set-unimportant', checkAuth, this.setUnimportantMessage.bind(this));
    routerInstance.get('/:id', this.getMessageById.bind(this));
    routerInstance.put('/:id/decrypt', checkAuth, this.decryptMessage.bind(this));
  }

  /**
   * Decrypt message.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async decryptMessage(req, res) {
    // Define params.
    const messageId = parseInt(req.params.id);
    if (isNaN(messageId)) {
      return res.send({ error: 'Message ID must be defined as number' });
    }
    const { decryptedBase64 } = req.body;
    if (typeof decryptedBase64 !== 'string') {
      return res.send({ error: 'Decrypted base64 should be defined as number.' });
    }

    // Check access token defined.
    if (!req.query.access_token) {
      const error = { message: 'Access token should be defined.' };
      return res.send(error);
    }

    // Get message.
    let message;
    try {
      message = await this.getById(messageId, req.query);
    } catch (error) {
      console.error(error);
      return res.send(error.statusCode, error.error);
    }
    if (!message || !message.messageId) {
      return res.send({ error: 'Can not get message.' });
    }

    // Update message.
    let updatedMessage;
    try {
      updatedMessage = await this.setDecrypted(messageId, decryptedBase64, req.query.access_token);
    } catch (error) {
      log.save('decrypt-message-error', { messageId, error: (error && error.message) || error }, 'error');
      return res.send({ message: 'Can not decrypt message.' });
    }

    // Response result.
    return res.send({ data: updatedMessage });
  }

  /**
   * Set decrypted.
   * @param {number} messageId Message ID.
   * @param {string} decryptedBase64 Decrypted base64.
   * @param {string} accessToken Access token.
   * @returns {object} Updated message.
   */
  async setDecrypted(messageId, decryptedBase64, accessToken) {
    try {
      await IncommingMessages.update(
        {
          is_encrypted: false,
          decrypted_base64: decryptedBase64,
        },
        {
          where: { message_id: messageId },
        },
      );
      const updatedMessage = await this.getById(messageId, { access_token: accessToken });
      return updatedMessage;
    } catch (error) {
      log.save('set-decrypted-message-error', { error: (error && error.message) || error }, 'error');
      throw error;
    }
  }

  /**
   * Send test message by email.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async sendTestEmail(req, res) {
    // Define params.
    const email = req.query.email;
    const subject = TEST_EMAIL.SUBJECT;
    const text = TEST_EMAIL.TEXT;

    // Check emails.
    const availableEmails = (global.conf && global.conf.testService && global.conf.testService.emails) || [];
    const isEmailExist = availableEmails.includes(email);
    if (!isEmailExist) {
      return res.send({ error: { message: 'Used email not defined as test in config.' } });
    }

    // Send.
    let sendingResult;
    try {
      sendingResult = await this.sendByEmails([email], subject, text);
    } catch (error) {
      return res.send({ error: { code: error.errorCode, message: error.message } });
    }

    // Response sending result.
    res.send({ data: sendingResult });
  }

  /**
   * Send test message by SMS.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async sendTestSMS(req, res) {
    // Define params.
    const phone = req.query.phone;
    const translit = TEST_SMS.MESSAGE_TRANSLIT;

    // Check phone number.
    const availablePhones = (global.conf && global.conf.testService && global.conf.testService.phones) || [];
    const isPhoneExist = availablePhones.includes(phone);
    if (!isPhoneExist) {
      return res.send({ error: { message: 'Used phone not defined as test in config.' } });
    }

    // Send.
    let sendingResult;
    try {
      sendingResult = await this.sendByPhones([phone], translit);
    } catch (error) {
      return res.send({ error: { code: error.errorCode, message: error.message } });
    }

    // Response sending result.
    res.send({ data: sendingResult });
  }

  /**
   * Send test message by user.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async sendTestUser(req, res) {
    // Define params.
    const userId = req.query.user_id;
    const subject = TEST_EMAIL.SUBJECT;
    const text = TEST_EMAIL.TEXT;
    const translit = TEST_SMS.MESSAGE_TRANSLIT;

    // Check user ID.
    const availableUserIds = (global.conf && global.conf.testService && global.conf.testService.userIds) || [];
    const isUserIdExist = availableUserIds.includes(userId);
    if (!isUserIdExist) {
      return res.send({ error: { message: 'Used user ID not defined as test in config.' } });
    }

    // Define user info.
    let usersInfo;
    try {
      usersInfo = await this.getUsers([userId]);
    } catch (e) {
      return res.send({ error: { code: error.errorCode, message: error.message } });
    }

    // Define destinetion params.
    const phones = usersInfo.map((user) => user.phone);
    const emails = usersInfo.map((user) => user.email);

    // Send email.
    let emailSendingResult;
    try {
      emailSendingResult = await this.sendByEmails(emails, subject, text);
    } catch (error) {
      emailSendingResult = { error: { code: error.errorCode, message: error.message } };
    }

    // Send SMS.
    let smsSendingResult;
    try {
      smsSendingResult = await this.sendByPhones(phones, translit);
    } catch (error) {
      smsSendingResult = { error: { code: error.errorCode, message: error.message } };
    }

    // Response sending result.
    res.send({ data: { emailSendingResult, smsSendingResult } });
  }

  /**
   * Send test message by complex options using notifyHub API.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async sendTestMessageByComplexOptions(req, res) {
    // Define params.
    const userId = req.query.user_id;
    const text = (req.body && req.body.text) || TEST_EMAIL.TEXT;
    const transfers = TRANSFERS;
    const options = OPTIONS;

    const normalizedText = await this.normalizeComplexText(text);

    // Check user ID.
    const availableUserIds = (global.conf && global.conf.testService && global.conf.testService.userIds) || [];
    const isUserIdExist = availableUserIds.includes(userId);
    if (!isUserIdExist) {
      return res.send({ error: { message: 'Used ID not defined as test in config.' } });
    }

    // Define user info.
    let usersInfo;
    try {
      usersInfo = await this.getUsers([userId]);
    } catch (error) {
      return res.send({ error: { code: error.errorCode, message: error.message } });
    }
    if (!usersInfo[0]) {
      return res.send({ error: { message: 'Can\'t find user data' } });
    }
    const user = usersInfo[0];

    // Define destination params.
    const phone = user.phone;
    const email = user.email;
    const phoneForLogging = phone ? phone.slice(0, -2) + '**' : '';
    const emailForLogging = email ? '**' + email.slice(2, email.length) : '';
    log.save('send-test-message-by-complex-option-request', { userId, phone: phoneForLogging, email: emailForLogging });

    let processingIdsList = [];
    for (const transfer of transfers) {
      // Send.
      const channel = this.getComplexMessageChannel(transfer);

      if (!channel) {
        console.log(`Could not define channel for tranfer: ${transfer}`);
        continue;
      }

      const optionsKey = this.getComplexMessageOptionKey(transfer);
      let sendingOptionsObject = {
        ...(options.general || {}),
        ...(options[optionsKey] || {}),
        Channel: channel,
        Phone: phone,
        email: email,
        MsgSubject: normalizedText,
        MsgBody: normalizedText,
      };
      const { processingId, rawResponse } = await this.sendToEConsultingComplexService(sendingOptionsObject);
      processingIdsList.push(processingId);
    }
    const isConnectionToEConsultApi = processingIdsList.some((v) => typeof v === 'string');
    log.save('send-test-message-by-complex-option-response', { response: processingIdsList });

    // Response sending result.
    res.send({ data: { isConnectionToEConsultApi, processingIdsList } });
  }

  async sendMessageByUsersList(req, res, next) {
    // Define params.
    let { body } = req;

    // Check if no need to handle.
    if (!this.issetUserList(body) && !this.issetUserIpnList(body)) {
      return res.send(400, { message: 'Users List empty' });
    }

    let result;
    let msg = await IncommingMessages.create({
      ...body,
      meta: body?.attachments?.length
        ? { attachments: body.attachments.map((v) => ({ fileId: v.fileId, p7sFileId: v.p7sFileId, fileName: v.filename })) }
        : {},
    });

    // Define not send parameter. (Just save message in db)
    const { not_send, is_important, allow_hide, expired_at } = body || {};
    if (not_send && typeof not_send !== 'boolean') {
      return res.send(400, { message: 'not_send parameter must have boolean type' });
    }

    let ipnNotFound = [];

    try {
      var usersInfo;
      if (this.issetUserList(body)) {
        usersInfo = await this.getUsers(body.list_user_id);
      } else if (this.issetUserIpnList(body)) {
        usersInfo = await this.getUsersByIpn(body.list_user_ipn);
        for (const ipn of body.list_user_ipn) {
          if (!usersInfo.some((v) => v.ipn === ipn)) {
            ipnNotFound.push(ipn);
          }
        }
      }
    } catch (e) {
      return res.send(e.statusCode, e.error);
    }
    let usersMessages;
    let sendBySms = usersInfo.map((v) => v.phone).filter((v) => !!v);
    let sendByEmail = usersInfo.map((v) => v.email).filter((v) => !!v);
    let sendByEmailPromise;
    let sendBySmsPromise;
    log.save('send-message-by-user-request', { phones: sendBySms, emails: sendByEmail });

    // Check if need to send by SMS.
    if (this.isValidShortMessageTranslit(body) && this.isValidShortMessage(body) && !not_send) {
      // Check phones prefix in SMS blacklist.
      const smsBlacklist = (global.conf && global.conf.smsBlacklist) || [];
      const phonesToSend = sendBySms;
      let allowedPhones = [];
      let blockedPhones = [];
      for (const phoneToSend of phonesToSend) {
        const isSmsBlacklistIncludesPhone = phoneToSend && smsBlacklist.some((v) => phoneToSend.startsWith(v));
        if (isSmsBlacklistIncludesPhone) {
          blockedPhones.push(phoneToSend);
        } else {
          allowedPhones.push(phoneToSend);
        }
      }
      if (blockedPhones.length > 0) {
        // Inform SMS can not be sent.
        log.save('send-message-by-user-blocked-by-blacklist', { blockedPhones, allowedPhones, smsBlacklist });
        sendBySms = { error: 'Some phones denied by blacklist.', blockedPhones };
      } else {
        // Send SMS.
        if (!not_send) {
          sendBySmsPromise = this.sendByPhones(sendBySms, body.short_message_translit, msg.message_id);
        }
      }
    }

    // Check if need to send by email.
    if (this.isValidFullMessage(body) && this.isValidTitleMessage(body)) {
      usersMessages = await UsersMessages.bulkCreate(
        usersInfo.map((v) => {
          let obj = {
            user_id: v.id,
            message_id: msg.message_id,
          };
          return obj;
        }),
        { returning: true },
      );
      usersMessages = usersMessages.map((v) => {
        return {
          userMessageId: v.user_message_id,
          userId: v.user_id,
          messageId: v.message_id,
        };
      });
      if (!not_send) {
        sendByEmailPromise = this.sendByEmails(sendByEmail, body.title_message, body.full_message, undefined, body.template_id, body.attachments);
      }

      if (is_important) {
        if (is_important && typeof is_important !== 'boolean') {
          return res.send(400, { message: 'is_important parameter must have boolean type' });
        } else if (typeof allow_hide !== 'undefined' && typeof allow_hide !== 'boolean') {
          return res.send(400, { message: 'allow_hide parameter must have boolean type' });
        }

        for (const message of usersMessages) {
          let importantData = {
            user_message_id: message.userMessageId,
            message_id: message.messageId,
            is_active: true,
          };

          if (typeof allow_hide !== 'undefined') {
            importantData.allow_hide = allow_hide;
          }
          if (typeof expired_at !== 'undefined') {
            importantData.expired_at = expired_at;
          }

          await ImportantMessages.create(importantData);
        }
      }
    }

    let isError = false;
    try {
      sendBySms = await sendBySmsPromise;
    } catch (error) {
      console.error(error);
      sendBySms = error && error.message;
      isError = true;
    }
    try {
      sendByEmail = await sendByEmailPromise;
    } catch (error) {
      console.error(error);
      sendByEmail = error && error.message;
      isError = true;
    }

    if (ipnNotFound.length) {
      isError = true;
    }

    result = { messageId: msg.message_id, usersMessages, sendBySms, sendByEmail, ...(ipnNotFound.length && { ipnNotFound: ipnNotFound }) };
    res.status(isError ? 500 : 200);
    return res.send(result);
  }

  /**
   * Send message by complex options.
   * @param {object} req HTTP request.
   * @param {object} req.body HTTP request body.
   * @param {number} req.body.workflowId Workflow ID.
   * @param {string[]} req.body.transfers Transfers list. Enum: "sms", "push", "email", "registeredLetter", "valuableLetter".
   * @param {{userId, ipn, address}} req.body.destination Destination params.
   * @param {{general: {}, sms: {outId}, push: {outId}, email: {outId}, postal: {outId, attach}}} req.body.options Additional options for defined transfers.
   * @param {{short, medium, large, largeTitle}} req.body.text Text.
   * @param {object} res HTTP response.
   */
  async sendMessageByComplexOptions(req, res) {
    // Define params.
    const { body } = req;
    const { workflowId, transfers, destination, options, text } = body || {};
    const eConsultingConf = (global.conf && global.conf.eConsultingService) || {};
    const { logAll } = eConsultingConf;
    log.save('send-message-by-complex-option-request');

    // Check main params.
    const errors = this.getComplexParamsErrors(workflowId, transfers, destination, options, text);
    if (errors.length > 0) {
      return res.send(400, { error: { message: 'Validation error.', list: errors } });
    }

    // Define detailed params.
    const { userId, ipn, address } = destination;
    const { short, medium, large, largeTitle } = text;
    const [normalizedShortText, normalizedMediumText, normalizedLargeText, normalizedLargeTitleText] = await Promise.all(
      [short, medium, large, largeTitle].map(async (v) => await this.normalizeComplexText(v)),
    );
    const normalizedText = { normalizedShortText, normalizedMediumText, normalizedLargeText, normalizedLargeTitleText };

    // Define user.
    let usersInfo, userInfo;
    if (userId) {
      try {
        usersInfo = await this.getUsers([userId]);
        userInfo = usersInfo && usersInfo[0];
        if (!userInfo) {
          return res.send(400, { error: { message: 'Can\'t find user by ID.' } });
        }
      } catch (error) {
        return res.send(400, { error: { message: 'User definition error.', details: error && error.message } });
      }
    }

    // Define email and phone.
    const { email, phone } = userInfo || {};
    const validEmail = email;
    const validPhone = userInfo && userInfo.valid && userInfo.valid.phone ? phone : undefined;
    const emailToSend = transfers.includes('email') ? validEmail : undefined;
    const phoneToSend = ['sms', 'push'].some((v) => transfers.includes(v)) ? validPhone : undefined;
    const emailForLogging = emailToSend ? '**' + emailToSend.slice(2, email.length) : '';
    const phoneForLogging = phoneToSend ? phoneToSend.slice(0, -2) + '**' : '';
    log.save('send-message-by-complex-option-request-body', { email: emailForLogging, phone: phoneForLogging });

    // Define user name.
    const lastName = (userInfo && userInfo.last_name) || undefined;
    const firstName = (userInfo && userInfo.first_name) || undefined;
    const middleName = (userInfo && userInfo.middle_name) || undefined;

    // Define phone prefix in SMS blacklist.
    const smsBlacklist = (global.conf && global.conf.smsBlacklist) || [];
    const isSmsBlacklistIncludesPhone = phoneToSend && smsBlacklist.some((v) => phoneToSend.startsWith(v));

    // Get options.
    const { attach } = (options && options.postal) || {};
    let attachLinks = [];
    try {
      attachLinks = await this.getAttachLinks(attach);
    } catch (error) {
      return res.send(500, { error: { message: 'Attach file links definition error.', details: error && error.message } });
    }
    const attachLinksString = attachLinks.join(';');

    // Prepare and send via E-Consulting.
    let processingIdsList = [];
    let rawResponsesList = [];
    for (const transfer of transfers) {
      // Log destination params.
      log.save('send-message-by-complex-option-transfer', { transfer, emailToSend, phoneToSend });

      // Check id it's SMS transfer and do not send if phone denied by blacklist.
      if (transfer === 'sms' && isSmsBlacklistIncludesPhone) {
        log.save('denied-by-sms-blacklist', { routeType: 'send-via-complex-options', transfer, phoneToSend, smsBlacklist });
        processingIdsList.push('User phone denied by blacklist.');
        rawResponsesList.push(null);
        continue;
      }

      // Send.
      const channel = this.getComplexMessageChannel(transfer);
      if (!channel) {
        console.log(`Could not define channel for tranfer: ${transfer}`);
        continue;
      }
      const optionsKey = this.getComplexMessageOptionKey(transfer);
      //const textKey = this.getComplexMessageTextKey(transfer);
      const textKey = this.getComplexMessageNormalizedTextKey(transfer);
      let sendingOptionsObject = {
        ...(options.general || {}),
        ...(options[optionsKey] || {}),
        Channel: channel,
        Phone: validPhone,
        email: validEmail,
        MsgDoc: attachLinksString,
        MsgSubject: largeTitle,
        MsgBody: normalizedText[textKey],
      };

      if (transfer === 'registeredLetter' || transfer === 'valuableLetter') {
        sendingOptionsObject['NameSecond'] = lastName;
        sendingOptionsObject['NameFirst'] = firstName;
        sendingOptionsObject['NameMiddle'] = middleName;
      }

      const { processingId, rawResponse } = await this.sendToEConsultingComplexService(sendingOptionsObject);
      processingIdsList.push(processingId);
      rawResponsesList.push(rawResponse);
    }
    const processingIdsString = processingIdsList.join(';');

    // Save incoming messages to DB.
    const incommingMessageParams = {
      workflow_id: workflowId,
      user_ipn: userId ? null : ipn,
      address,
      list_user_id: userId ? [userId] : null,
      list_phone: phoneToSend ? [phoneToSend] : null,
      list_email: emailToSend ? [emailToSend] : null,
      short_message: normalizedShortText,
      medium_message: normalizedMediumText,
      full_message: normalizedLargeText,
      title_message: normalizedLargeTitleText,
      processing_id: processingIdsString,
    };
    let incommingMessageInstance;
    try {
      incommingMessageInstance = await IncommingMessages.create(incommingMessageParams);
    } catch (error) {
      return res.send(500, { error: { message: 'Incomming message saving error.', details: error && error.message } });
    }

    // Save user message to DB if defined.
    if (userId) {
      const userMessagesParams = {
        user_id: userId,
        message_id: incommingMessageInstance.message_id,
      };
      try {
        await UsersMessages.create(userMessagesParams);
      } catch (error) {
        return res.send(500, { error: { message: 'Users message saving error.', details: error && error.message } });
      }
    }

    // Response.
    const response = { processingIds: processingIdsList, rawResponses: rawResponsesList };
    log.save('send-message-by-complex-option-response', { response });
    res.send(response);
  }

  /**
   * Get complex message channel.
   * @param {string} transfer Transfer.
   * @returns {string} Channel ID.
   */
  getComplexMessageChannel(transfer) {
    return COMPLEX_MESSAGE_TRANSFER_CHANNELS_MAP[transfer];
  }

  /**
   * Get complex message option key.
   * @param {string} transfer Transfer.
   * @returns {string} Option key.
   */
  getComplexMessageOptionKey(transfer) {
    return COMPLEX_MESSAGE_TRANSFER_OPTIONS_MAP[transfer];
  }

  /**
   * Get complex message text key.
   * @param {string} transfer Transfer.
   * @returns {string} Text key.
   */
  getComplexMessageTextKey(transfer) {
    return COMPLEX_MESSAGE_TRANSFER_TEXT_MAP[transfer];
  }

  /**
   * Get complex message normalized text key.
   * @param {string} transfer Transfer.
   * @returns {string} Text key.
   */
  getComplexMessageNormalizedTextKey(transfer) {
    return COMPLEX_MESSAGE_TRANSFER_NORMALIZED_TEXT_MAP[transfer];
  }

  /**
   * Send to E-Consulting complex service.
   * @param {object} sendingOptionsObject Sending options object.
   * @param {{short, medium, large, largeTitle}} text Text object.
   * @returns {Promise<{processingId, rawResponse}>} Sending result promise.
   */
  async sendToEConsultingComplexService(sendingOptionsObject) {
    // Prepare E-Consulting service options.
    const eConsultingConf = (global.conf && global.conf.eConsultingService) || {};
    const { sendComplexMessageUrl, Authorization, logAll } = eConsultingConf;

    if (!sendComplexMessageUrl) {
      const error = { message: 'E-Consulting service URL not defined.' };
      log.save('econsulting-complex-service-error', error, 'error');
      return { error };
    }

    log.save('econsulting-complex-service-request', { sendToEConsultingComplexService: logAll ? sendingOptionsObject : '***' });
    const requestSendingOptions = {
      url: sendComplexMessageUrl,
      method: 'POST',
      headers: {
        Authorization: Authorization || 'Basic key:AAAAAAAAAA',
      },
      data: {
        ...sendingOptionsObject,
      },
      json: true,
    };

    // Send.
    let rawResponse = await axios(requestSendingOptions).then((v) => v.data);

    // Log and return response.
    const response = { processingId: rawResponse && rawResponse.MessageID, rawResponse };
    log.save('econsulting-complex-service-response', { response });
    return response;
  }

  /**
   * Get attach links.
   * @param {string[]} attach Attach file names in OpenStack.
   * @returns {Promise<string[]>} Attach persist links promise.
   */
  async getAttachLinks(attach = []) {
    const attachLinksPromises = attach.map((v) => this.getAttachLink(v));
    const attachLinks = await Promise.all(attachLinksPromises);
    return attachLinks;
  }

  /**
   * Get attach link.
   * @param {string} attachItem Attach file name in OpenStack.
   * @returns {Promise<string>} Attach persist link promise.
   */
  async getAttachLink(attachItem) {
    // Prepare persist link options.
    const persistLinkConf = (global.conf && global.conf.persistLink) || {};
    const { createLinkUrl, openStackServerName, token } = persistLinkConf;
    const requestPersistLinkOptions = {
      url: createLinkUrl || 'http://0.0.0.0:3346/link',
      method: 'POST',
      headers: {
        token: token || 'Basic djdTSnV1Q3BxYVl3UHdRSmpmTUtnYWc4cDhHOWFCNnBwVWJZTENNdDg0Zzg3RjNXSmh1ZWtlWTVmdzZaOGplOA==',
      },
      data: {
        type: 'openStack',
        options: {
          serverName: openStackServerName || 'court_dev',
          fileName: attachItem,
        },
        small: true,
      },
      json: true,
    };

    // Define persist link.
    let attachLink = (await axios(requestPersistLinkOptions)).data;
    return attachLink;
  }

  /**
   * Get static link.
   * @param {string} link Link.
   * @returns {Promise<string>} Persist link promise.
   */
  async getStaticLink(link) {
    // Prepare persist link options.
    const persistLinkConf = (global.conf && global.conf.persistLink) || {};
    const { createLinkUrl, token } = persistLinkConf;
    const requestPersistLinkOptions = {
      url: createLinkUrl || 'http://0.0.0.0:3346/link',
      method: 'POST',
      headers: {
        token: token || 'Basic djdTSnV1Q3BxYVl3UHdRSmpmTUtnYWc4cDhHOWFCNnBwVWJZTENNdDg0Zzg3RjNXSmh1ZWtlWTVmdzZaOGplOA==',
      },
      data: {
        type: 'simple',
        options: {
          url: link,
          redirect: true,
        },
        small: true,
      },
      json: true,
    };

    // Define persist link.
    let attachLink = (await axios(requestPersistLinkOptions)).data;
    return attachLink;
  }

  /**
   * Normalize complex text.
   * @param {string} text Text to normalize.
   * @param {{key: string, value: string}[]} keyValueOptions Key-value options.
   * @returns {Promise<string>} Normalized complex text promise.
   */
  async normalizeComplexText(text, keyValueOptions = []) {
    // Return if not a string.
    if (typeof text !== 'string') {
      return;
    }

    // Define normalized text container.
    let normalizedText = text;

    // Replace all keys.
    for (const keyValueOption of keyValueOptions) {
      const { key, value } = keyValueOption;
      if (key === value) {
        continue;
      }
      while (normalizedText.indexOf(key) >= 0) {
        normalizedText = normalizedText.replace(key, value);
      }
    }

    // Set links to documents.
    const persistLinkConf = (global.conf && global.conf.persistLink) || {};
    const { documentLinkPrefix } = persistLinkConf;
    while (normalizedText.indexOf('{document=') !== -1) {
      // Define replacing params.
      const startIndex = normalizedText.indexOf('{document=');
      let substringWithId = normalizedText.substring(startIndex);
      const substringEndIndex = substringWithId.indexOf('}') + 1;
      substringWithId = substringWithId.substring(0, substringEndIndex);
      const documentId = substringWithId.split('=')[1].split('}')[0];
      const staticLink = await this.getStaticLink(`${documentLinkPrefix || 'https://cab-test-court-services.liquio.local/claims/'}${documentId}`);

      // Set link.
      normalizedText = normalizedText.replace(substringWithId, staticLink);
    }

    // Return normalized text.
    return normalizedText;
  }

  /**
   * Get complex params errors.
   * @param {string} workflowId Workflow ID.
   * @param {string[]} transfers Transfers list.
   * @param {{userId, ipn, address}} destination Destination params.
   * @param {{sms, push, email, postal}} options Options.
   * @param {{short, medium, long}} text Text params.
   * @returns {string[]} Errors list.
   */
  getComplexParamsErrors(workflowId, transfers, destination, options, text) {
    // Define errors container.
    let errors = [];

    // Check main params.
    if (!Array.isArray(transfers) || transfers.some((v) => typeof v !== 'string')) {
      errors.push('Transfers should be defined as an array of strings.');
    }
    if (['object', 'undefined'].every((v) => typeof destination !== v)) {
      errors.push('Destination should be an object if defined.');
    }
    if (['object', 'undefined'].every((v) => typeof options !== v)) {
      errors.push('Options should be an object if defined.');
    }
    if (typeof text !== 'object') {
      errors.push('Text should be defined as an object with format { short: string, medium: string, large: string }.');
    }
    if (errors.length > 0) {
      return errors;
    }

    // Check other params.
    if (!text.short && !text.medium && !text.long) {
      errors.push('Text not defined.');
    }
    return errors;
  }

  async sendMessageByEmailsList(req, res, next) {
    let { body } = req,
      result;
    const { sendBy } = body;

    if (!this.issetEmailsList(body)) {
      return res.send(400, { message: 'Emails list empty' });
    }
    if (!this.isValidFullMessage(body)) {
      return res.send(400, { message: 'Full message not valid' });
    }
    if (!this.isValidTitleMessage(body)) {
      return res.send(400, { message: 'Title message not valid' });
    }

    let sendByEmail;
    try {
      await IncommingMessages.create({ ...body });
      sendByEmail = await this.sendByEmails(
        body.list_email,
        body.title_message,
        body.full_message,
        sendBy,
        body.template_id,
        body.attachments,
        body.doNotEscapeEmail,
      );
    } catch (e) {
      console.error(e);
      return res.send(e.errorCode, e.message);
    }
    result = { sendByEmail };
    return res.send(result);
  }

  async sendMessageByPhonesList(req, res, next) {
    let { body } = req,
      result;

    log.save('send-message-by-phone-request', { list_phone: body.list_phone });

    if (!this.issetPhonesList(body)) {
      return res.send(400, { message: 'Phones list empty' });
    }

    // Check phones prefix in SMS blacklist.
    const smsBlacklist = (global.conf && global.conf.smsBlacklist) || [];
    const phonesToSend = Array.isArray(body.list_phone) ? body.list_phone : [body.list_phone];

    let allowedPhones = [];
    let blockedPhones = [];
    for (const phoneToSend of phonesToSend) {
      const isSmsBlacklistIncludesPhone = phoneToSend && smsBlacklist.some((v) => phoneToSend.startsWith(v));
      if (isSmsBlacklistIncludesPhone) {
        blockedPhones.push(phoneToSend);
      } else {
        allowedPhones.push(phoneToSend);
      }
    }
    if (blockedPhones.length > 0) {
      log.save('send-message-by-phone-blocked-by-blacklist', { blockedPhones, allowedPhones, smsBlacklist });
      return res.send(500, { error: 'Some phones denied by blacklist.', blockedPhones });
    }

    const sendSmsByNotifyhubAPI = global.conf && global.conf.sendSmsByNotifyhubAPI;
    if (sendSmsByNotifyhubAPI) {
      const phone = allowedPhones && allowedPhones[0];
      // Define body for e-consulting service.
      const bodyParameters = {
        Channel: SMS_CHANNEL,
        MsgBody: body.short_message || '',
        Phone: phone,
      };

      const { processingId, rawResponse } = await this.sendToEConsultingComplexService(bodyParameters);

      // Response.
      const response = { processingId, rawResponse };
      return res.send(response);
    }

    if (!this.isValidShortMessageTranslit(body) && this.isValidShortMessage(body)) {
      body.short_message_translit = this.createTranslitMesssage(body.short_message);
    }
    try {
      var msg = await IncommingMessages.create({ ...body });
    } catch (e) {
      return res.send(500, e);
    }

    let sendBySMS = async () => {
      try {
        let sendBySms = await this.sendByPhones(allowedPhones, body.short_message_translit, msg.message_id);
        result = { sendBySms };
      } catch (e) {
        if (e.statusCode) return res.send(e.statusCode, e);
        else result = e;
      }
      return res.send(result);
    };
    if (body.private && !!body.private == true) {
      try {
        let sendBySender = await Corezoid.sendMessageToSender(allowedPhones, body.short_message_translit);
        idxCache.set(sendBySender.ref, { list_phone: allowedPhones, short_message_translit: body.short_message_translit });
        result = sendBySender.response;
        return res.send(result);
      } catch (e) {
        return res.send();
      }
    } else {
      sendBySMS();
    }
  }

  async sendMessageByEventId(req, res, next) {
    let { body } = req,
      result;
    if (!this.issetEventId(body)) {
      return res.send(400, { message: 'Event ID empty' });
    }
    try {
      var msg = await IncommingMessages.create({ ...body });
    } catch (e) {
      return res.send(500, e);
    }
    try {
      var events = await this.findEvents(body);
    } catch (e) {
      return res.send(e.statusCode, e.error);
    }

    let settingsArray = await Subscribes.findAll({
      attributes: ['user_id', 'setting_id'],
      where: {
        setting_id: events.settings.map((v) => v.dataValues.id),
      },
    });

    try {
      result = await this.sendOn(body, settingsArray, events, msg.message_id);
    } catch (e) {
      await IncommingMessages.destroy({ where: { message_id: msg.message_id } });
      return res.send(e.errorCode, e);
    }

    if (msg) {
      let users_idx = new Set(settingsArray.map((v) => v.user_id));
      await UsersMessages.bulkCreate(
        [...users_idx].map((v) => {
          let obj = {
            user_id: v,
            message_id: msg.message_id,
            event_id: events.event_id,
          };
          return obj;
        }),
      );
    }

    return res.send(result);
  }

  async getMessages(req, res, next) {
    // Define params.
    const showAll = req.query.showAll === 'true';

    // Define result.
    let result, resultCount, unreadQuantity, readQuantity;
    if (req.query.access_token || req.query.user_id) {
      try {
        let userId = req.query.user_id || (await this.checkToken(req.query.access_token))._id;
        let queryParams = { ...req.query, user_id: req.query.user_id || userId };
        delete queryParams.access_token;
        const resultPromise = showAll && req.query.access_token ? this.getAllUserMessages(queryParams) : this.getUserMessages(queryParams);
        const resultCountPromise =
          showAll && req.query.access_token ? this.getAllUserMessagesCount(queryParams) : this.getUserMessagesCount(queryParams);
        const unreadQuantityPromise = showAll && req.query.access_token ? this.countUnreadMessages(queryParams) : 0;
        const readQuantityPromise = showAll && req.query.access_token ? this.countReadMessages(queryParams) : 0;
        [result, resultCount, unreadQuantity, readQuantity] = await Promise.all([
          resultPromise,
          resultCountPromise,
          unreadQuantityPromise,
          readQuantityPromise,
        ]);
      } catch (e) {
        return res.send(e.statusCode, e);
      }
    } else {
      result = await this.getAllMessages(req.query);
    }

    // Response result.
    res.setHeader(HEADER_TOTAL_COUNT, resultCount || 0);
    const meta = {
      pagination: { total: resultCount },
      unread: unreadQuantity,
      read: readQuantity,
    };
    return res.send({ result, meta });
  }

  async getAllMessages(queryParams) {
    // Define params.
    const startFrom = parseInt(queryParams.start) || PAGINATION_START_FROM;
    const count = parseInt(queryParams.count) || PAGINATION_TO;

    let messages;
    try {
      const queryOptions = {
        offset: startFrom,
        limit: count,
        where: {
          event_id: {
            $ne: null,
            $or: {
              $ne: 0,
            },
          },
        },
        include: [
          {
            model: Events,
            where: {
              enable: true,
              name: {
                $notILike: '%комунал%', //Этот код убирает с телефончика в футере сообщения по аварии
              },
              private: false,
            },
          },
        ],
        limit: 10,
        order: [['date_create', 'desc']],
      };
      log.save('get-all-messages-query-options', { queryOptions });
      messages = await IncommingMessages.findAll(queryOptions);
    } catch (e) {
      throw e;
    }

    return messages.map((v) => {
      return {
        id: v.message_id,
        Created: v.date_create,
        ListType: v.event ? v.event.name : null,
        text:
          v.short_message != null && v.short_message.trim().length > 0
            ? v.short_message
            : v.short_message_translit != null
              ? v.short_message_translit
              : v.full_message,
      };
    });
  }

  async getUserMessages(obj) {
    // Define params.
    const startFrom = parseInt(obj.start) || PAGINATION_START_FROM;
    const count = parseInt(obj.count) || PAGINATION_TO;
    const isRead = parseInt(obj.is_read);
    const fromCreatedAt = obj.from_created_at;
    const toCreatedAt = obj.to_created_at;
    const clientId = obj.client_id;

    let user_id;
    if ('access_token' in obj) {
      try {
        var userId = await this.checkToken(obj.access_token);
      } catch (e) {
        console.error(e);
        throw e;
      }
      user_id = userId._id;
    } else if ('user_id' in obj) {
      user_id = obj.user_id;
    }

    const filterObj =
      isRead === 0 ? { user_id, $or: [{ is_read: isRead }, { is_read: null }] } : isRead === 1 ? { user_id, is_read: isRead } : { user_id };
    if (fromCreatedAt && toCreatedAt) {
      filterObj.$and = [
        Sequelize.where(Sequelize.fn('date', Sequelize.col('incomming_message.date_create')), { $between: [fromCreatedAt, toCreatedAt] }),
      ];
    } else if (fromCreatedAt) {
      filterObj.$and = [Sequelize.where(Sequelize.fn('date', Sequelize.col('incomming_message.date_create')), { $gte: fromCreatedAt })];
    } else if (toCreatedAt) {
      filterObj.$and = [Sequelize.where(Sequelize.fn('date', Sequelize.col('incomming_message.date_create')), { $lte: toCreatedAt })];
    }

    let incomingMessagesFilterObject = {};
    if (clientId) {
      incomingMessagesFilterObject.client_id = clientId;
    }

    const queryOptions = {
      offset: startFrom,
      limit: count,
      where: filterObj,
      include: [
        {
          model: IncommingMessages,
          where: incomingMessagesFilterObject,
          include: [
            {
              model: Events,
              attributes: ['name'],
              where: {
                enable: true,
                private: false,
              },
            },
          ],
        },
      ],
      order: [[IncommingMessages, 'date_create', 'desc']],
    };
    let messages = await UsersMessages.findAll(queryOptions);
    return messages.map((v) => {
      return {
        id: v.incomming_message.message_id,
        Created: v.incomming_message.date_create,
        ListType: v.incomming_message.event ? v.incomming_message.event.name : null,
        text:
          v.incomming_message.short_message != null && v.incomming_message.short_message.trim().length > 0
            ? v.incomming_message.short_message
            : v.incomming_message.short_message_translit != null
              ? v.incomming_message.short_message_translit
              : v.incomming_message.full_message,
        isRead: v.is_read,
      };
    });
  }

  async getUserMessagesCount(obj) {
    let user_id;
    if ('access_token' in obj) {
      try {
        var userId = await this.checkToken(obj.access_token);
      } catch (e) {
        console.error(e);
        throw e;
      }
      user_id = userId._id;
    } else if ('user_id' in obj) {
      user_id = obj.user_id;
    }

    const isRead = parseInt(obj.is_read);
    const fromCreatedAt = obj.from_created_at;
    const toCreatedAt = obj.to_created_at;
    const clientId = obj.client_id;
    const filterObj = isRead === 0 || isRead === 1 ? { user_id, is_read: isRead } : { user_id };
    if (fromCreatedAt && toCreatedAt) {
      filterObj.$and = [
        Sequelize.where(Sequelize.fn('date', Sequelize.col('incomming_message.date_create')), { $between: [fromCreatedAt, toCreatedAt] }),
      ];
    } else if (fromCreatedAt) {
      filterObj.$and = [Sequelize.where(Sequelize.fn('date', Sequelize.col('incomming_message.date_create')), { $gte: fromCreatedAt })];
    } else if (toCreatedAt) {
      filterObj.$and = [Sequelize.where(Sequelize.fn('date', Sequelize.col('incomming_message.date_create')), { $lte: toCreatedAt })];
    }

    let incomingMessagesFilterObject = {};
    if (clientId) {
      incomingMessagesFilterObject.client_id = clientId;
    }

    let messagesCount = await UsersMessages.count({
      where: filterObj,
      include: [
        {
          model: IncommingMessages,
          where: incomingMessagesFilterObject,
          include: [
            {
              model: Events,
              attributes: ['name'],
              where: {
                enable: true,
                private: false,
              },
            },
          ],
        },
      ],
    });

    return messagesCount;
  }

  /**
   * Get all user messages.
   * @param {object} queryParams Query params.
   */
  async getAllUserMessages(queryParams) {
    // Define params.
    const startFrom = parseInt(queryParams.start) || PAGINATION_START_FROM;
    const count = parseInt(queryParams.count) || PAGINATION_TO;
    const isRead = parseInt(queryParams.is_read);
    const orderByDateType = queryParams.order_date === 'asc' ? 'asc' : 'desc'; // Order by DESC by default.
    const fromCreatedAt = queryParams.from_created_at;
    const toCreatedAt = queryParams.to_created_at;
    const clientId = queryParams.client_id;

    // Define user.
    let user_id;
    if ('access_token' in queryParams) {
      try {
        var userId = await this.checkToken(queryParams.access_token);
      } catch (e) {
        console.error(e);
        throw e;
      }
      user_id = userId._id;
    } else if ('user_id' in queryParams) {
      user_id = queryParams.user_id;
    }

    // Try to get event ID filter.
    const { event_id, search } = queryParams;

    // Define messages info.
    const userMessagesFilterObject =
      isRead === 0 ? { user_id, $or: [{ is_read: isRead }, { is_read: null }] } : isRead === 1 ? { user_id, is_read: isRead } : { user_id };
    if (fromCreatedAt && toCreatedAt) {
      userMessagesFilterObject.$and = [
        Sequelize.where(Sequelize.fn('date', Sequelize.col('incomming_message.date_create')), { $between: [fromCreatedAt, toCreatedAt] }),
      ];
    } else if (fromCreatedAt) {
      userMessagesFilterObject.$and = [
        Sequelize.where(Sequelize.fn('date', Sequelize.col('incomming_message.date_create')), { $gte: fromCreatedAt }),
      ];
    } else if (toCreatedAt) {
      userMessagesFilterObject.$and = [Sequelize.where(Sequelize.fn('date', Sequelize.col('incomming_message.date_create')), { $lte: toCreatedAt })];
    }

    let incomingMessagesFilterObject = {};
    if (event_id) {
      incomingMessagesFilterObject.event_id = parseInt(event_id);
    }
    if (search) {
      const searchString = `%${search}%`;
      incomingMessagesFilterObject.$or = [{ title_message: { $iLike: searchString } }, { full_message: { $iLike: searchString } }];
    }

    if (clientId) {
      incomingMessagesFilterObject.client_id = clientId;
    }

    const queryOptions = {
      offset: startFrom,
      limit: count,
      where: userMessagesFilterObject,
      include: [
        {
          model: IncommingMessages,
          where: incomingMessagesFilterObject,
          include: [
            {
              model: Events,
              attributes: ['name'],
            },
            {
              model: MessageCryptTypes,
              attributes: ['rule_to_show'],
            },
          ],
        },
      ],
      order: [[IncommingMessages, 'date_create', orderByDateType]],
    };
    let messages = await UsersMessages.findAll(queryOptions);

    // Return messages info.
    messages = messages.map((v) => {
      return {
        messageId: v.incomming_message.message_id,
        createdAt: v.incomming_message.date_create,
        eventId: v.incomming_message.event_id,
        event: v.incomming_message.event ? v.incomming_message.event.name : null,
        titleMessage: v.incomming_message.title_message,
        fullMessage: v.incomming_message.full_message,
        shortMessage: v.incomming_message.short_message,
        shortMessageTranslit: v.incomming_message.short_message_translit,
        messageCryptTypeId: v.incomming_message.message_crypt_type_id,
        isEncrypted: v.incomming_message.is_encrypted,
        decryptedBase64: v.incomming_message.decrypted_base64,
        sender: v.incomming_message.sender,
        meta: v.incomming_message.meta,
        ruleToShow: v.incomming_message.message_crypt_type && v.incomming_message.message_crypt_type.rule_to_show,
        isRead: v.is_read,
        showToAll: v.show_to_all,
      };
    });

    // Check if decrypted.
    for (const message of messages) {
      if (message.ruleToShow) {
        try {
          message.decryptedToShow = eval(message.ruleToShow)(message.decryptedBase64);
        } catch (error) {
          message.decryptionToShowError = (error && error.message) || error;
        }
      }
    }

    return messages;
  }

  /**
   * Get count of user messages.
   * @param {object} queryParams Query params.
   */
  async getAllUserMessagesCount(queryParams) {
    // Define user.
    let user_id;
    if ('access_token' in queryParams) {
      try {
        var userId = await this.checkToken(queryParams.access_token);
      } catch (e) {
        console.error(e);
        throw e;
      }
      user_id = userId._id;
    } else if ('user_id' in queryParams) {
      user_id = queryParams.user_id;
    }

    // Try to get event ID filter.
    const { event_id, search } = queryParams;
    const isRead = parseInt(queryParams.is_read);
    const fromCreatedAt = queryParams.from_created_at;
    const toCreatedAt = queryParams.to_created_at;
    const clientId = queryParams.client_id;

    // Define messages info.
    const userMessagesFilterObject =
      isRead === 0 ? { user_id, $or: [{ is_read: isRead }, { is_read: null }] } : isRead === 1 ? { user_id, is_read: isRead } : { user_id };
    if (fromCreatedAt && toCreatedAt) {
      userMessagesFilterObject.$and = [
        Sequelize.where(Sequelize.fn('date', Sequelize.col('incomming_message.date_create')), { $between: [fromCreatedAt, toCreatedAt] }),
      ];
    } else if (fromCreatedAt) {
      userMessagesFilterObject.$and = [
        Sequelize.where(Sequelize.fn('date', Sequelize.col('incomming_message.date_create')), { $gte: fromCreatedAt }),
      ];
    } else if (toCreatedAt) {
      userMessagesFilterObject.$and = [Sequelize.where(Sequelize.fn('date', Sequelize.col('incomming_message.date_create')), { $lte: toCreatedAt })];
    }

    let incomingMessagesFilterObject = {};
    if (event_id) {
      incomingMessagesFilterObject.event_id = parseInt(event_id);
    }
    if (search) {
      const searchString = `%${search}%`;
      incomingMessagesFilterObject.$or = [{ title_message: { $iLike: searchString } }, { full_message: { $iLike: searchString } }];
    }
    if (clientId) {
      incomingMessagesFilterObject.client_id = clientId;
    }
    const messagesCount = await UsersMessages.count({
      where: userMessagesFilterObject,
      include: [
        {
          model: IncommingMessages,
          where: incomingMessagesFilterObject,
          include: [
            {
              model: Events,
              attributes: ['name'],
            },
          ],
        },
      ],
    });

    // Return messages info.
    return messagesCount;
  }

  async setIsReadProperty(req, res) {
    // Define params.
    let messageIds, messageIdsArray;
    try {
      messageIds = req.query.messages.split(',');
      messageIdsArray = messageIds.map((v) => {
        return parseInt(v);
      });
    } catch (error) {
      return res.send(500, { error: 'Message ids should be defined in query.' });
    }

    let countUpdatedRows;
    if (req.query.access_token || req.query.user_id) {
      // Update message data.
      try {
        countUpdatedRows = await this.setIsReadByMessageId(req.query, messageIdsArray);
      } catch (e) {
        console.error(e);
        return res.send(e.statusCode, e.error);
      }
    } else {
      const error = {
        message: 'Access token and user id should be defined.',
      };
      return res.send(error);
    }
    const isSet = countUpdatedRows && countUpdatedRows[0] && countUpdatedRows[0] === messageIdsArray.length ? true : false;

    // Response result.
    return res.send({ isSet });
  }

  /**
   * Set isRead property by message ID.
   * @param {object} queryParams Query params.
   */
  async setIsReadByMessageId(queryParams, messageIds) {
    // Define user.
    let user_id;
    if ('access_token' in queryParams) {
      try {
        var userId = await this.checkToken(queryParams.access_token);
      } catch (e) {
        console.error(e);
        throw e;
      }
      user_id = userId._id;
    } else if ('user_id' in queryParams) {
      user_id = queryParams.user_id;
    }

    // Define params.
    const userMessagesFilterObject = {
      user_id,
      message_id: { $in: messageIds },
    };
    const updatedMessageCount = await UsersMessages.update(
      {
        is_read: READ_MESSAGE_VALUE,
      },
      {
        where: userMessagesFilterObject,
      },
    );

    // Return messages info.
    return updatedMessageCount;
  }

  async getUnreadUserMessagesCount(req, res) {
    let total;
    if (req.query.access_token || req.query.user_id) {
      // Update message data.
      try {
        let userId;
        if (req.query.access_token) {
          userId = (await this.checkToken(req.query.access_token))._id;
        }
        let queryParams = { ...req.query, user_id: req.query.user_id || userId };
        delete queryParams.access_token;
        total = await this.countUnreadMessages(queryParams);
      } catch (e) {
        console.error(e);
        return res.send(e.statusCode, e.error);
      }
    } else {
      const error = {
        message: 'Access token and user id should be defined.',
      };
      return res.send(error);
    }

    // Response result.
    return res.send({ total });
  }

  async countUnreadMessages(queryParams) {
    // Define user.
    let user_id;
    if ('access_token' in queryParams) {
      try {
        var userId = await this.checkToken(queryParams.access_token);
      } catch (e) {
        console.error(e);
        throw e;
      }
      user_id = userId._id;
    } else if ('user_id' in queryParams) {
      user_id = queryParams.user_id;
    }

    // Try to get event ID filter.
    const { event_id } = queryParams;

    // Define messages info.
    const userMessagesFilterObject = {
      user_id,
      $or: [{ is_read: UNREAD_MESSAGE_VALUE }, { is_read: null }],
    };
    let incomingMessagesFilterObject = {};
    if (event_id) {
      incomingMessagesFilterObject.event_id = parseInt(event_id);
    }
    if (queryParams.client_id) {
      incomingMessagesFilterObject.client_id = queryParams.client_id;
    }
    const messagesCount = await UsersMessages.count({
      where: userMessagesFilterObject,
      include: [
        {
          model: IncommingMessages,
          where: incomingMessagesFilterObject,
          include: [
            {
              model: Events,
              attributes: ['name'],
            },
          ],
        },
      ],
    });

    // Return messages info.
    return messagesCount;
  }

  async countReadMessages(queryParams) {
    // Define user.
    let user_id;
    if ('access_token' in queryParams) {
      try {
        var userId = await this.checkToken(queryParams.access_token);
      } catch (e) {
        console.error(e);
        throw e;
      }
      user_id = userId._id;
    } else if ('user_id' in queryParams) {
      user_id = queryParams.user_id;
    }

    // Try to get event ID filter.
    const { event_id } = queryParams;

    // Define messages info.
    const userMessagesFilterObject = { user_id, is_read: READ_MESSAGE_VALUE };
    let incomingMessagesFilterObject = {};
    if (event_id) {
      incomingMessagesFilterObject.event_id = parseInt(event_id);
    }
    const messagesCount = await UsersMessages.count({
      where: userMessagesFilterObject,
      include: [
        {
          model: IncommingMessages,
          where: incomingMessagesFilterObject,
          include: [
            {
              model: Events,
              attributes: ['name'],
            },
          ],
        },
      ],
    });

    return messagesCount;
  }

  async getMessageById(req, res) {
    // Define params.
    const messageId = parseInt(req.params.id);
    if (isNaN(messageId)) {
      return res.send(400, { error: 'Message ID must be defined as number' });
    }

    let message;
    if (req.query.access_token || req.query.user_id) {
      // Get message data.
      try {
        message = await this.getById(messageId, req.query);
        if (!message) {
          return res.send(404, { error: 'Message not found.' });
        }
      } catch (error) {
        log.save('get-message-by-id-error', { messageId: req.params.id, error: (error && error.message) || error }, 'error');
        return res.send(500, { error: (error && error.message) || error });
      }
    } else {
      const error = {
        message: 'Access token or user id should be defined.',
      };
      return res.send(400, error);
    }

    // Response result.
    return res.send(message);
  }

  async getById(messageId, queryParams) {
    // Define user.
    let user_id;
    if ('access_token' in queryParams) {
      try {
        var userId = await this.checkToken(queryParams.access_token);
      } catch (e) {
        console.error(e);
        throw e;
      }
      user_id = userId._id;
    } else if ('user_id' in queryParams) {
      user_id = queryParams.user_id;
    } else {
      throw new Error('Should be defined in query access_token or user_id.');
    }

    // Define messages info.
    const userMessagesFilterObject = { user_id, message_id: messageId };
    let incomingMessagesFilterObject = {};
    const message = await UsersMessages.findOne({
      where: userMessagesFilterObject,
      include: [
        {
          model: IncommingMessages,
          where: incomingMessagesFilterObject,
          include: [
            {
              model: Events,
              attributes: ['name'],
            },
          ],
        },
      ],
    });

    // Message not found.
    if (!message) {
      return;
    }

    // Form response data.
    const currentMessage = {
      messageId: message.incomming_message.message_id,
      createdAt: message.incomming_message.date_create,
      eventId: message.incomming_message.event_id,
      event: message.incomming_message.event ? v.incomming_message.event.name : null,
      titleMessage: message.incomming_message.title_message,
      fullMessage: message.incomming_message.full_message,
      shortMessage: message.incomming_message.short_message,
      shortMessageTranslit: message.incomming_message.short_message_translit,
      messageCryptTypeId: message.incomming_message.message_crypt_type_id,
      isEncrypted: message.incomming_message.is_encrypted,
      decryptedBase64: message.incomming_message.decrypted_base64,
      sender: message.incomming_message.sender,
      isRead: message.is_read,
      userMessageId: message.user_message_id,
      userId: message.user_id,
    };

    // Check if decrypted.
    if (!currentMessage.isEncrypted && currentMessage.decryptedBase64) {
      const messageCryptType = await MessageCryptTypes.findOne({ where: { id: currentMessage.messageCryptTypeId } });
      const { rule_to_show: ruleToShow } = messageCryptType;
      try {
        currentMessage.decryptedToShow = eval(ruleToShow)(currentMessage.decryptedBase64);
      } catch (error) {
        currentMessage.decryptionToShowError = (error && error.message) || error;
      }
    }

    // Return messages info.
    return currentMessage;
  }

  async sendOn(body, settingsArray, events, msgid) {
    let users_idx = new Set(settingsArray.map((v) => v.user_id));
    let communications = events.settings.map((v) => {
      return {
        name: v.dataValues.communication.dataValues.name,
        setting_id: v.dataValues.id,
      };
    });

    try {
      var usersInfos = await this.getUsersInfo([...users_idx]);
    } catch (e) {
      console.error(e);
      throw e;
    }
    communications = communications.map((val) => {
      let r = settingsArray.filter((v) => {
        return v.setting_id === val.setting_id;
      });
      let user_id = r.map((v) => v.user_id);
      val.users = [
        ...new Set(
          user_id.map((v) => {
            let user = usersInfos.find((u) => u._id === v && 'valid' in u && u.valid.phone == true);
            if (user) return { phone: user.phone, email: user.email };
          }),
        ),
      ];
      val.users = val.users.filter((v) => !!v == true);
      delete val.setting_id;
      return val;
    });
    let sendBySms, sendByEmail;
    if (this.isValidShortMessageTranslit(body) && (this.isValidShortMessage(body) || body.short_message == '')) {
      sendBySms = communications.find((v) => v.name === 'sms');
      let txt;
      if (body.short_message.trim().length > 0) {
        txt = body.short_message;
      } else {
        txt = body.short_message_translit;
      }
      try {
        sendBySms = await this.sendByPhones(
          sendBySms.users.map((v) => v.phone),
          body.short_message_translit,
          msgid,
        );
      } catch (e) {
        throw e;
      }
    }
    if (this.isValidFullMessage(body) && this.isValidTitleMessage(body)) {
      sendByEmail = communications.find((v) => v.name === 'email');
      try {
        sendByEmail = await this.sendByEmails(
          sendByEmail.users.map((v) => v.email),
          events.name,
          body.full_message,
        );
      } catch (e) {
        throw e;
      }
    }

    return { sendBySms, sendByEmail };
  }

  async prepareUserToEvent(body, result) {
    let arr = body.list_user_id.map(async (user_id) => {
      let arr = result.settings.map(async (val) => {
        val = val.dataValues;
        return await Subscribes.findOne({
          where: {
            user_id,
            setting_id: val.id,
          },
        });
      });
      let t = await Promise.all(arr);
      return t.filter((v) => v !== null);
    });
    let t = await Promise.all(arr);
    return (result = t.filter((v) => v.length != 0));
  }

  async findEvents(body) {
    let r = await Events.findOne({
      // attributes: [['setting_id','id']],
      where: {
        enable: true,
        event_id: body.event_id,
      },
      include: [
        {
          model: Settings,
          attributes: [['setting_id', 'id']],
          where: {
            enable: true,
            event_id: body.event_id,
          },
          include: [
            {
              model: Communication,
              // as:"name",
              attributes: ['communication_id', 'name'],
              where: {
                enable: true,
              },
            },
          ],
        },
      ],
    });
    if (r == null) throw new Object({ error: 'Event id not found', statusCode: 500 });
    return r;
  }

  issetUserList(body) {
    return body.list_user_id && body.list_user_id.length > 0 && false === body.list_user_id.some((v) => v.trim() == '');
  }

  issetUserIpnList(body) {
    return body.list_user_ipn && body.list_user_ipn.length > 0 && false === body.list_user_ipn.some((v) => v.trim() == '');
  }

  issetPhonesList(body) {
    return body.list_phone && body.list_phone.length > 0;
  }

  issetEmailsList(body) {
    return body.list_email && body.list_email.length > 0;
  }

  issetEventId(body) {
    return body.event_id && (body.event_id != 0 || body.event_id != undefined || body.event_id != null);
  }

  isValidShortMessage(body) {
    return body.short_message && body.short_message.trim().length <= 160;
  }

  isValidShortMessageTranslit(body) {
    return body.short_message_translit && body.short_message_translit.trim().length > 0 && body.short_message_translit.trim().length <= 160;
  }

  isValidFullMessage(body) {
    return body.full_message && body.full_message.trim().length > 0;
  }

  isValidTitleMessage(body) {
    return body.title_message && body.title_message.trim().length > 0;
  }

  /**
   * Get users.
   * @param {string[]} list_user_id Users IDs list.
   * @returns {{id, phone, email, valid: {phone: boolean}, isLegal, companyName, last_name, first_name, middle_name, edrpou, ipn}[]} Users contact info.
   */
  async getUsers(list_user_id) {
    try {
      var usersFull = await this.getUsersInfo(list_user_id);
    } catch (e) {
      throw e;
    }
    return usersFull.map((v) => {
      return {
        phone: v.phone,
        email: v.email,
        id: v._id,
        valid: v.valid,
        isLegal: v.isLegal,
        companyName: v.companyName,
        last_name: v.last_name,
        first_name: v.first_name,
        middle_name: v.middle_name,
        edrpou: v.edrpou,
        ipn: v.ipn,
      };
    });
  }

  /**
   * Get users by ipn.
   * @param {string[]} ipn Users ipn list.
   * @returns {{id, phone, email, valid: {phone: boolean}, isLegal, companyName, last_name, first_name, middle_name, edrpou, ipn}[]} Users contact info.
   */
  async getUsersByIpn(ipn) {
    try {
      const users = await this.getUsersInfoByIpn(ipn);

      return users.map((v) => {
        return {
          phone: v.phone,
          email: v.email,
          id: v._id,
          valid: v.valid,
          isLegal: v.isLegal,
          companyName: v.companyName,
          last_name: v.last_name,
          first_name: v.first_name,
          middle_name: v.middle_name,
          edrpou: v.edrpou,
          ipn: v.ipn,
        };
      });
    } catch (e) {
      throw e;
    }
  }

  async sendByPhones(users, short_message_translit, msgid) {
    let sendBySms;
    console.log(`Users: ${users}.`);
    try {
      if (users.length == 1) {
        sendBySms = await messangerGate.sendOneSms(users[0], short_message_translit, msgid);
      } else if (users.length > 1) {
        sendBySms = await messangerGate.sendSms(users, short_message_translit, msgid);
      }
      return sendBySms;
    } catch (e) {
      throw e;
    }
  }

  /**
   * Send by emails.
   * @param {string[]} users Emails list.
   * @param {string} subject Subject.
   * @param {string} fullMessage Full message.
   * @param {string} sendBy Send by email info.
   * @param {number} [templateId] Template ID.
   * @param {object[]} [attachments] Attachments.
   * @param {boolean} [doNotEscapeEmail] Do not escape email indicator.
   */
  async sendByEmails(users, subject, fullMessage, sendBy, templateId, attachments, doNotEscapeEmail = false) {
    // Normalize full message.
    let normalizedFullMessage = await this.normalizeFullMessage(fullMessage);

    if (templateId) {
      const template = await Templates.findByPk(templateId);
      if (template) {
        normalizedFullMessage = template.text.replace('{{body}}', normalizedFullMessage);
      }
    }

    // Handle.
    let sendByEmail;
    try {
      if (users.length == 1) {
        let t;
        t = await MailerModel.sendOneMail({
          text: normalizedFullMessage,
          subject,
          email: users[0],
          sendBy,
          attachments,
          doNotEscapeEmail,
        });
        sendByEmail = (t && t.result) || t;
      } else if (users.length > 1) {
        let t = await MailerModel.sendMail({
          text: normalizedFullMessage,
          subject,
          users,
          sendBy,
          attachments,
          doNotEscapeEmail,
        });
        sendByEmail = (t && t.result) || t;
      }
    } catch (e) {
      console.log(e);
      throw e;
    }
    return sendByEmail;
  }

  /**
   * Normalize full message.
   * @param {string} fullMessage Full message.
   * @returns {Promise<string>} Normalized full message.
   */
  async normalizeFullMessage(fullMessage) {
    const normalizedFullMessage = `${fullMessage}`.replace(new RegExp('{{[^}}]{0,}}}', 'g'), '');
    return normalizedFullMessage;
  }

  createTranslitMesssage(message) {
    return message;
  }

  async addMessage(req, res, next) {
    let { body } = req,
      result;

    if (this.issetEventId(body) && this.issetUserList(body)) {
      try {
        var msg = await IncommingMessages.create({ ...body });
      } catch (e) {
        return res.send(500, e);
      }
      try {
        var events = await this.findEvents(body);
      } catch (e) {
        return res.send(e.statusCode, e.error);
      }

      let settingsIdx = await this.prepareUserToEvent(body, events);
      let filter = function () {
        return new Promise((resolve, reject) => {
          let arr = [];
          for (let i in settingsIdx) {
            let v = settingsIdx[i];
            arr = [...arr, ...v];
            if (parseInt(i) + 1 == settingsIdx.length) resolve(arr);
          }
        });
      };
      let settingsArray = await filter();

      try {
        result = await this.sendOn(body, settingsArray, events, msg.message_id);
      } catch (e) {
        await IncommingMessages.destroy({ where: { message_id: msg.message_id } });
        return res.send(e.errorCode, e);
      }

      if (msg) {
        await UsersMessages.bulkCreate(
          body.list_user_id.map((v) => {
            let obj = {
              user_id: v,
              message_id: msg.message_id,
              event_id: events.event_id,
            };
            return obj;
          }),
        );
      }

      /*result = await this.sendOn(body, settingsArray, events,msg.message_id);
   
       await UsersMessages.bulkCreate(body.list_user_id.map(v=> {
       let obj = {
       user_id: v,
       message_id: msg.message_id,
       event_id: events.event_id
       }
       return obj;
       }))*/

      return res.send(result);
    }
  }

  async sendToAllUsers(req, res) {
    let { body } = req;

    if (!this.isValidFullMessage(body) || !this.isValidTitleMessage(body)) {
      const inputParamsError = new Error('Not valid message.');
      return res.send(400, inputParamsError);
    }

    let msg;
    try {
      msg = await IncommingMessages.create({ ...body });
    } catch (err) {
      log.save('send-msg-to-all-create-incomming-message-error', { error: err }, 'error');
      return res.send(500, err);
    }

    let userMsg;
    try {
      userMsg = await UsersMessages.create({
        user_id: '',
        message_id: msg.message_id,
        show_to_all: true,
      });
    } catch (err) {
      log.save('send-msg-to-all-create-user-message-error', { error: err }, 'error');
      return res.send(500, err);
    }

    const userMsgId = userMsg.message_id;
    return res.send({ createdMessageId: userMsgId });
  }

  async getMessagesToAllUsers(req, res) {
    let queryParams = { ...req.query };
    const startFrom = parseInt(queryParams.start) || PAGINATION_START_FROM;
    const count = parseInt(queryParams.count) || PAGINATION_TO;
    const orderByDateType = queryParams.order_date === 'asc' ? 'asc' : 'desc'; // Order by DESC by default.

    let result;
    try {
      result = await UsersMessages.findAll({
        offset: startFrom,
        limit: count,
        where: { show_to_all: true },
        include: [
          {
            model: IncommingMessages,
          },
        ],
        order: [[IncommingMessages, 'date_create', orderByDateType]],
      });
    } catch (error) {
      log.save('get-messages-to-all-users-error', { error: (error && error.message) || error }, 'error');
      return res.send(500, { error: (error && error.message) || error });
    }

    const messages = result.map((v) => {
      return {
        messageId: v.incomming_message.message_id,
        createdAt: v.incomming_message.date_create,
        eventId: v.incomming_message.event_id,
        event: v.incomming_message.event ? v.incomming_message.event.name : null,
        titleMessage: v.incomming_message.title_message,
        fullMessage: v.incomming_message.full_message,
        shortMessage: v.incomming_message.short_message,
        shortMessageTranslit: v.incomming_message.short_message_translit,
        isRead: v.is_read,
        showToAll: v.show_to_all,
      };
    });

    return res.send({ messages });
  }

  async deleteMessagetoAll(req, res) {
    const { params } = req;
    const { id } = params;

    let deletedFromIncomming;
    try {
      deletedFromIncomming = await IncommingMessages.destroy({ where: { message_id: id } });
    } catch (error) {
      log.save('delete-msg-to-all-delete-incomming-message-error', { error }, 'error');
      return res.send(500, error);
    }

    let deletedFromMsg;
    if (deletedFromIncomming) {
      try {
        deletedFromMsg = await UsersMessages.destroy({
          where: { message_id: id },
        });
      } catch (error) {
        log.save('delete-msg-to-all-delete-user-message-error', { error }, 'error');
        return res.send(500, error);
      }
    }

    const isDeleted = deletedFromMsg || deletedFromMsg === 0 ? true : false;
    return res.send({ isDeleted });
  }

  async senderErrorCallack(req, res, next) {
    //TODO
    let { id } = req.query;
    console.log('id', id);
    try {
      let value = idxCache.get(id, true);
      let sendBySms = await this.sendByPhones(value.list_phone, value.short_message_translit);
      let result = { sendBySms };
      console.log('result', result);
      return res.send(result);
    } catch (err) {
      // ENOTFOUND: Key `not-existing-key` not found
      console.error('err', err);
      res.send(err);
    }
  }

  async gmsuCallback(req, res, next) {
    //TODO
    let { extra_id, status } = req.body;
    if (~~status == 2) {
      try {
        let value = idxCache.get(id, true);
        let removed = await messangerGate.removeFromQueue(message_id);
        let result = { removed };
        console.log('result', result);
        return res.send(result);
      } catch (err) {
        // ENOTFOUND: Key `not-existing-key` not found
        console.error('err', err);
        res.send(err);
      }
    } else {
      res.send();
    }
  }

  /**
   * Get important messages.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getImportantMessages(req, res) {
    try {
      // Check access token defined.
      if (!req.query.access_token && !req.query.user_id) {
        const error = { error: 'Access token or user_id should be defined.' };
        return res.send(400, error);
      }

      let queryParams = { ...req.query };
      const orderByCreatedAt = queryParams.order_created_at === 'asc' ? 'asc' : 'desc'; // Order by DESC by default.

      let messages = [];

      let userId;
      if (req.query.access_token) {
        userId = (await this.checkToken(req.query.access_token))._id;
      } else {
        userId = req.query.user_id;
      }

      let incomingMessagesFilterObject = {};
      if (queryParams.client_id) {
        incomingMessagesFilterObject.client_id = queryParams.client_id;
      }

      const result = await ImportantMessages.findAll({
        where: {
          is_active: true,
          $or: [{ expired_at: { $gte: Sequelize.fn('now') } }, { expired_at: { $eq: null } }],
        },
        include: [
          {
            model: IncommingMessages,
            where: incomingMessagesFilterObject,
          },
          {
            model: UsersMessages,
            attributes: [],
            where: { user_id: userId },
          },
        ],
        order: [['created_at', orderByCreatedAt]],
      });

      if (Array.isArray(result)) {
        messages = result.map((v) => {
          return {
            id: v.id,
            messageId: v.incomming_message.message_id,
            createdAt: v.incomming_message.date_create,
            eventId: v.incomming_message.event_id,
            event: v.incomming_message.event ? v.incomming_message.event.name : null,
            titleMessage: v.incomming_message.title_message,
            fullMessage: v.incomming_message.full_message,
            shortMessage: v.incomming_message.short_message,
            shortMessageTranslit: v.incomming_message.short_message_translit,
            isActive: v.is_active,
            allowHide: v.allow_hide,
            expiredAt: v.expired_at,
          };
        });
      }

      return res.send({ data: messages });
    } catch (error) {
      log.save('get-important-messages-error', { error: (error && error.message) || error }, 'error');
      return res.send(500, { error: (error && error.message) || error });
    }
  }

  /**
   * Set unimportant message when allow_hide is true.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async setUnimportantMessage(req, res) {
    try {
      // Define params.
      const messageId = parseInt(req.params.id);
      if (isNaN(messageId)) {
        return res.send(400, { error: 'Message ID must be defined as number' });
      }

      // Check access token defined.
      if (!req.query.access_token && !req.query.user_id) {
        const error = { error: 'Access token or user_id should be defined.' };
        return res.send(400, error);
      }

      let userId;
      if (req.query.access_token) {
        userId = (await this.checkToken(req.query.access_token))._id;
      } else {
        userId = req.query.user_id;
      }

      // Update important message.
      let updatedImportantMessage;

      const message = await this.getById(messageId, req.query);
      if (message) {
        if (message.userId !== userId) {
          return res.send(404, { error: 'Not found message for this user_id.' });
        }

        // Check strict allow_hide.
        if (typeof req.query.strict_allow_hide !== 'undefined' && req.query.strict_allow_hide === 'true') {
          const importantMessage = await ImportantMessages.findOne({ where: { message_id: messageId, user_message_id: message.userMessageId } });
          if (importantMessage && importantMessage.allow_hide === false) {
            const error = { error: 'Param allow_hide set false.' };
            return res.send(400, error);
          }
        }

        const [, importantMessages] = await ImportantMessages.update(
          { is_active: false, allow_hide: true },
          {
            where: { user_message_id: message.userMessageId },
            returning: true,
          },
        );
        if (importantMessages.length === 1) {
          [updatedImportantMessage] = importantMessages;
        }
      } else {
        return res.send(404, { error: 'Message not found.' });
      }

      // Response result.
      return res.send({ data: updatedImportantMessage });
    } catch (error) {
      log.save('set-unimportant-message-error', { messageId: req.params.id, error: (error && error.message) || error }, 'error');
      return res.send(500, { error: (error && error.message) || error });
    }
  }
};

module.exports = Message;
