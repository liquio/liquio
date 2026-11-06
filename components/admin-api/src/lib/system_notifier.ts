import { getTraceId } from '@liquio/back-core';

import { getConfig, getLog } from './context';
import { HttpRequest } from './http_request';
import { getInternalHttpsAgent } from './internal_transport';

/**
 * System Notifier.
 */
export class SystemNotifier {
  private static singleton: SystemNotifier;

  private adminUrl: string;
  private emailServer: string;
  private emailPort: number;
  private emailRoutes: any;
  private emailTimeout: number;
  private emailUser: string;
  private emailPassword: string;
  private headers: any;
  private emails: string[];
  private emailSubject: string;
  private emailBody: string;

  /**
   * System Notifier constructor.
   */
  constructor() {
    if (!SystemNotifier.singleton) {
      this.adminUrl = getConfig().system_notifier.adminUrl;
      this.emailServer = getConfig().system_notifier.email.server;
      this.emailPort = getConfig().system_notifier.email.port;
      this.emailRoutes = getConfig().system_notifier.email.routes;
      this.emailTimeout = getConfig().system_notifier.email.timeout;
      this.emailUser = getConfig().system_notifier.email.user;
      this.emailPassword = getConfig().system_notifier.email.password;
      this.headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Basic ${Buffer.from(`${getConfig().system_notifier.email.user}:${getConfig().system_notifier.email.password}`, 'utf8').toString('base64')}`,
      };
      this.emails = getConfig().system_notifier.email.emails;
      this.emailSubject = getConfig().system_notifier.email.subject;
      this.emailBody = getConfig().system_notifier.email.body;
      SystemNotifier.singleton = this;
    }
    return SystemNotifier.singleton;
  }

  /**
   * Send email.
   * @returns {object}
   */
  async sendEmails(workflowId) {
    try {
      // Define request body.
      const bodyObject = {
        list_email: this.emails,
        title_message: this.emailSubject,
        full_message: this.emailBody.replace('{url}', this.adminUrl + '/process/' + workflowId),
      };
      const body = JSON.stringify(bodyObject);

      // Do request to send emails.
      const url = `${this.emailServer}:${this.emailPort}${this.emailRoutes.sendEmail}`;
      getLog().save('system-notifier-email-sending-request', { url, emailsCount: this.emails?.length ?? 0 });
      const response = await HttpRequest.send({
        url,
        httpsAgent: getInternalHttpsAgent(),
        method: HttpRequest.Methods.POST,
        headers: {
          ...this.headers,
          'x-trace-id': getTraceId(),
        },
        body,
      });
      getLog().save('system-notifier-email-sending-response', response);

      return {
        data: bodyObject,
        response,
      };
    } catch (error) {
      getLog().save('system-notifier-email-sending-error', error.message);
      throw error;
    }
  }
}
