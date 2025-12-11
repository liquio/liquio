const HttpRequest = require('./http_request');
const { getTraceId } = require('./async_local_storage');

/**
 * System Notifier.
 */
class SystemNotifier {
  /**
   * System Notifier constructor.
   */
  constructor() {
    if (!SystemNotifier.singleton) {
      this.adminUrl = global.config.system_notifier.adminUrl;
      this.emailServer = global.config.system_notifier.email.server;
      this.emailPort = global.config.system_notifier.email.port;
      this.emailRoutes = global.config.system_notifier.email.routes;
      this.emailTimeout = global.config.system_notifier.email.timeout;
      this.emailUser = global.config.system_notifier.email.user;
      this.emailHashedPassword = global.config.system_notifier.email.hashedPassword;
      this.headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Basic ${global.config.system_notifier.email.user}:${global.config.system_notifier.email.hashedPassword}`,
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
      log.save('system-notifier-email-sending-request', { url, body });
      const response = await HttpRequest.send({
        url,
        method: HttpRequest.Methods.POST,
        headers: {
          ...this.headers,
          'x-trace-id': getTraceId(),
        },
        body,
      });
      log.save('system-notifier-email-sending-response', response);

      return {
        data: bodyObject,
        response,
      };
    } catch (error) {
      log.save('system-notifier-email-sending-error', error.message);
      throw error;
    }
  }
}

module.exports = SystemNotifier;
