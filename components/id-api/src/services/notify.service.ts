import axios from 'axios';

import { Config } from '../config';
import { BaseService } from './base_service';

export class NotifyService extends BaseService {
  private readonly cfg: Config['notify'];

  constructor(...args: ConstructorParameters<typeof BaseService>) {
    super(...args);

    this.cfg = this.config.notify;
  }

  get isEnabled(): boolean {
    return Boolean(this.cfg?.url);
  }

  get url(): string {
    return this.cfg?.url!;
  }

  get authorization(): string {
    return this.cfg?.authorization!;
  }

  async sendSms(phoneNumber: string, text: string) {
    let body = {
      list_phone: [phoneNumber],
      short_message: text.toString(),
      short_message_translit: text.toString(),
    };
    this.log.save('send-sms-to', { phoneNumber }, 'info');

    if (!this.isEnabled) {
      this.log.save('send-sms-error', { error: 'Notify config is not defined' }, 'error');
      throw new Error('Notify config is not defined');
    } else {
      try {
        const { data } = await axios.post(this.url + '/message/phonesList', body, {
          headers: {
            Authorization: this.authorization,
            'Content-Type': 'application/json',
          },
        });

        return data;
      } catch (error) {
        this.log.save('sended-sms-error', { error }, 'error');
        throw error;
      }
    }
  }

  async sendMail(email: string, text: string, title: string) {
    try {
      const templates = await this.getTemplates();
      const message = await this.prepareTpl(templates, text, title);

      let body = {
        list_email: [email],
        title_message: message.title,
        full_message: message.fullText,
      };
      this.log.save('send-email-to', { email }, 'info');

      await axios.post(this.url + '/message/emailsList', body, {
        headers: {
          Authorization: this.authorization,
          'Content-Type': 'application/json',
        },
      });
      this.log.save('email-send-success', { body }, 'info');
    } catch (error) {
      this.log.save('email-send-error', { error }, 'error');
      throw error;
    }
  }

  async subscribeUserForce(userId: string) {
    try {
      this.log.save('subscribe-user-force', { userId }, 'info');
      await axios({
        url: this.url + '/subscribeUserForce',
        headers: { Authorization: this.authorization },
        params: { user_id: userId },
      });
    } catch (error: any) {
      this.log.save('subscribe-user-force-error', { error: error.message }, 'error');
    }
  }

  private async getTemplates() {
    return axios.get(this.url + '/template').then((response) => response.data);
  }

  private async prepareTpl(array: any[], text: string, title: string) {
    const neededTpl = array.find((v: any) => v.title == title);

    if (!neededTpl) return { title, fullText: text.toString() };

    return axios
      .post(this.url + '/prepareMessageByTemplateId', {
        template_id: neededTpl.template_id,
        params: {
          code: text,
        },
      })
      .then((response) => {
        return { title: neededTpl.title, fullText: response.data.message };
      });
  }
}
