import { getConfig, getLog } from './context';
import { HttpRequest } from './http_request';
import { getTraceId } from './async_local_storage';

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
  headers: Record<string, string>;
  emails: string[];
  emailSubject: string;
  emailBody: string;

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
  async sendEmails({ workflowId, workflowTemplateName, workflowErrorsSubscribers = [], gatewayTemplateId, gatewayTemplateName, error }: any) {
    try {
      // Define emails to send message. Concat workflow errors subscribers and emails from config.
      const workflowErrorsSubscribersEmails = workflowErrorsSubscribers.map(({ email }: any) => email);
      const emailsToProceed = [...workflowErrorsSubscribersEmails, ...this.emails];

      // Define request body.
      const bodyObject = {
        list_email: emailsToProceed,
        title_message: this.emailSubject.replace('{workflowTemplateName}', workflowTemplateName),
        full_message: this.emailBody
          .replace('{url}', this.adminUrl + '/workflow/journal/' + workflowId)
          .replace('{gatewayTemplateId}', gatewayTemplateId)
          .replace('{gatewayTemplateName}', gatewayTemplateName)
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
      });
      getLog().save('system-notifier-email-sending-response', response);

      return {
        data: bodyObject,
        response,
      };
    } catch (error: any) {
      getLog().save('system-notifier-email-sending-error', error.message);
      throw error;
    }
  }
}
