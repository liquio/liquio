const nodemailer = require('nodemailer');

const { conf } = global;

const phpListModel = class {
  constructor() {
    this.log = global.log;
    this.config = conf.smtpServer || {};

    this.senderEmail = this.config.sender_email || '\'noreply\' <noreply@localhost>';
  }

  async sendMail(body) {
    const { users, text, subject, sendBy, doNotEscapeEmail, attachments } = body;

    const responsesList = [];
    if (Array.isArray(users)) {
      let errors = [];
      for (const user of users) {
        const msgOptions = { text, subject, email: user, sendBy, doNotEscapeEmail, attachments };
        let response;
        try {
          response = await this.sendOneMail(msgOptions);
        } catch (error) {
          errors.push(error);
        }
        responsesList.push(response && response.result);
      }
      if (errors.length > 0) {
        throw errors[0];
      }
    }
    return { result: responsesList };
  }

  async sendOneMail(body) {
    const { sendBy } = body;

    let transport;
    try {
      transport = nodemailer.createTransport(this.config);
    } catch (error) {
      this.log.save('send-one-email-transport-error', { error: error?.message, body }, 'error');
    }

    const attachments = body.attachments
      ? body.attachments.map((v) => {
        return { filename: v.filename, content: v.content, encoding: 'base64' };
      })
      : [];

    if (body.doNotEscapeEmail) {
      this.log.save('do-not-escape-email', { body }, 'info');
    }
    const mailOptions = {
      from: sendBy || this.senderEmail,
      to: body.doNotEscapeEmail ? body.email : body.email.replace(/(\+.*@)/g, '@'), // list of receivers
      subject: body.subject, // Subject line
      text: body.text.replace(/<style.*<\/style>/gim, ''), // plaintext body
      html: body.text, // html body,
      attachments: attachments,
    };

    // send mail with defined transport object
    let result;
    try {
      result = await transport.sendMail(mailOptions);
      this.log.save('send-one-email-result', { result, mailOptions }, 'info');
      return { result };
    } catch (error) {
      this.log.save('send-one-email-error', { error: error?.message, mailOptions }, 'error');
      throw error;
    }
  }
};

module.exports = phpListModel;
