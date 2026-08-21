import { HttpRequest } from './http_request';

/**
 * System Notifier.
 */
export class SystemNotifier {
  static singleton: SystemNotifier;

  adminUrl: string;
  emailServer: string;
  emailPort: number;
  emailRoutes: any;
  emailTimeout: number;
  emailUser: string;
  emailPassword: string;
  headers: any;
  emails: string[];
  emailSubject: string;
  emailBody: string;

  /**
   * System Notifier constructor.
   */
  constructor() {
    if (!SystemNotifier.singleton) {
      this.adminUrl = global.config.system_notifier.adminUrl;
      this.emailServer = global.config.system_notifier.email.server;
      this.emailPort = global.config.system_notifier.email.port;
      this.emailRoutes = global.config.system_notifier.email.routes;
      this.emailTimeout = global.config.system_notifier.email.timeout || 30000;
      this.emailUser = global.config.system_notifier.email.user;
      this.emailPassword = global.config.system_notifier.email.password;
      this.headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Basic ${Buffer.from(`${global.config.system_notifier.email.user}:${global.config.system_notifier.email.password}`, 'utf8').toString('base64')}`,
      };
      this.emails = global.config.system_notifier.email.emails;
      this.emailSubject = global.config.system_notifier.email.subject;
      this.emailBody = global.config.system_notifier.email.body;
      SystemNotifier.singleton = this;
    }
    return SystemNotifier.singleton;
  }

  /**
   * Send email.
   * @returns {object}
   */
  async sendEmails(workflowId, workflowTemplateName, error) {
    try {
      // Define request body.
      const bodyObject = {
        list_email: this.emails,
        title_message: this.emailSubject.replace('{workflowTemplateName}', workflowTemplateName),
        full_message: this.emailBody.replace('{url}', this.adminUrl + '/process/' + workflowId).replace('{error}', error),
      };
      const body = JSON.stringify(bodyObject);

      // Do request to send emails.
      const url = `${this.emailServer}:${this.emailPort}${this.emailRoutes.sendEmail}`;
      global.log.save('system-notifier-email-sending-request', { url, body });
      const response = await HttpRequest.send({
        url,
        method: HttpRequest.Methods.POST,
        headers: this.headers,
        body,
        timeout: this.emailTimeout,
      });
      global.log.save('system-notifier-email-sending-response', response);

      return {
        data: bodyObject,
        response,
      };
    } catch (error) {
      global.log.save('system-notifier-email-sending-error', error.message);
      throw error;
    }
  }
}
