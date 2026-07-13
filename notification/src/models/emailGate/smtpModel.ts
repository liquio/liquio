import nodemailer from 'nodemailer';

const { conf } = global as any;

export class SmtpModel {
  log: any;
  config: any;
  senderEmail: string;

  constructor() {
    this.log = global.log;
    this.config = conf.smtpServer || {};

    this.senderEmail = this.config.sender_email || '\'noreply\' <noreply@localhost>';
  }

  get isEnabled(): boolean {
    return this.config.isEnabled !== false;
  }

  getDisabledResult(): { skipped: boolean; reason: string } {
    return { skipped: true, reason: 'SMTP is disabled in config.' };
  }

  async sendMail(body: any): Promise<any> {
    const { users, text, subject, sendBy, doNotEscapeEmail, attachments } = body;

    if (!this.isEnabled) {
      const result = this.getDisabledResult();
      this.log.save('send-email-skipped', { users, subject, reason: result.reason }, 'info');
      return { result: Array.isArray(users) ? users.map(() => result) : [] };
    }

    const responsesList: any[] = [];
    if (Array.isArray(users)) {
      const errors: any[] = [];
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

  async sendOneMail(body: any): Promise<any> {
    const { sendBy } = body;

    if (!this.isEnabled) {
      const result = this.getDisabledResult();
      this.log.save('send-one-email-skipped', { email: body.email, subject: body.subject, reason: result.reason }, 'info');
      return { result };
    }

    let transport;
    try {
      transport = nodemailer.createTransport(this.config);
    } catch (error: any) {
      this.log.save('send-one-email-transport-error', { error: error?.message, body }, 'error');
    }

    const attachments = body.attachments
      ? body.attachments.map((v: any) => {
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
      result = await transport!.sendMail(mailOptions);
      this.log.save('send-one-email-result', { result, mailOptions }, 'info');
      return { result };
    } catch (error: any) {
      this.log.save('send-one-email-error', { error: error?.message, mailOptions }, 'error');
      throw error;
    }
  }
}
