import { getTraceId } from '@liquio/back-core';

import { HttpRequest } from './http_request';
import { getConfig, getLog } from './context';

/**
 * System Notifier.
 */
export class SystemNotifier {
  private static singleton: SystemNotifier;

  adminUrl: any;
  emailBody: any;
  emailPassword: any;
  emailPort: any;
  emailRoutes: any;
  emailServer: any;
  emailSubject: any;
  emailTimeout: any;
  emailUser: any;
  emails: any;
  headers: any;

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
  async sendEmails({ workflowId, workflowTemplateName, workflowErrorsSubscribers = [], taskTemplateId, taskTemplateName, error }) {
    try {
      // Define emails to send message. Concat workflow errors subscribers and emails from config.
      const workflowErrorsSubscribersEmails = workflowErrorsSubscribers.map(({ email }) => email);
      const emailsToProceed = [...workflowErrorsSubscribersEmails, ...this.emails];

      // Define request body.
      const bodyObject = {
        list_email: emailsToProceed,
        title_message: this.emailSubject.replace('{workflowTemplateName}', workflowTemplateName),
        full_message: this.emailBody
          .replace('{url}', this.adminUrl + '/workflow/journal/' + workflowId)
          .replace('{taskTemplateId}', taskTemplateId)
          .replace('{taskTemplateName}', taskTemplateName)
          .replace('{error}', error),
      };
      const body = JSON.stringify(bodyObject);

      // Do request to send emails.
      const url = `${this.emailServer}:${this.emailPort}${this.emailRoutes.sendEmail}`;
      getLog().save('system-notifier-email-sending-request', { url, body });
      const response = await HttpRequest.send({
        url,
        method: HttpRequest.Methods.POST,
        headers: {
          ...this.headers,
          'x-trace-id': getTraceId(),
        },
        body,
        timeout: this.emailTimeout,
      });
      getLog().save('system-notifier-email-sending-response', response);

      return {
        data: bodyObject,
        response,
      };
    } catch (error) {
      getLog().save('system-notifier-email-sending-error', error.message, 'error');
      throw error;
    }
  }
}
