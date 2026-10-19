import axios from 'axios';

import * as conf from '../../config/config';
import { createHttpsAgent } from '../../lib/tls';
import { maskPhone, maskPhones, redactMessage, summarizeError } from '../../lib/mask';
import { SmsQueueModel } from '../sms_queue';

const SmsQueue = new SmsQueueModel().SmsQueue;

export class AbstractGate {
  options: any;
  adapter: any;

  get isEnabled(): boolean {
    return !(conf as any).smsServer || (conf as any).smsServer.isEnabled !== false;
  }

  getDisabledResult(target: unknown): { skipped: boolean; reason: string; target: unknown } {
    return { skipped: true, reason: 'SMS is disabled in config.', target };
  }

  async sendRequest(object: any): Promise<any> {
    object.json = true;
    try {
      // Optional per-gateway TLS options (private CA). Default agent verifies certificates.
      const httpsAgent = createHttpsAgent((conf as any).smsServer?.tls);
      const t = await axios(httpsAgent ? { ...object, httpsAgent } : object);
      return t;
    } catch (e) {
      console.error('SMS gateway error:', summarizeError(e));
      throw e;
    }
  }

  async sendSms(phones: string[], text: string, _msgid?: string): Promise<any> {
    phones = phones.filter((v) => !!v == true);

    if (!this.isEnabled) {
      const result = phones.map((phone) => this.getDisabledResult(phone));
      global.log.save('send-sms-skipped', { phones: maskPhones(phones), text: redactMessage(text), reason: 'SMS is disabled in config.' }, 'info');
      return result;
    }

    phones = phones.map((v) => v.replace(/(\+38)?(38)?(3838)?/, '38'));
    if (phones.length <= 100) {
      try {
        this.options.url =
          ((conf as any).smsServer && (conf as any).smsServer.url ? (conf as any).smsServer.url : 'https://test.liquio.local') +
          '/Subscribe/SendSmsQ.php';
        this.options.method = 'POST';
        this.options.form = {
          tel: phones,
          // msgid,//if OTP => msgid = undefined
          text,
          pass: (global as any).crypto
            .createHash('md5')
            .update(`${text}SaLt${phones.join(',')}`)
            .digest('hex'),
        };
        const t = await this.sendRequest(this.options);
        return t;
      } catch (e) {
        console.error('SMS gateway error:', summarizeError(e));
        throw e;
      }
    } else {
      const arr: string[][] = [[]];
      let counter = 0;
      for (let i = 0; i < phones.length; i++) {
        if (i % 100 == 0) {
          arr.push([phones[i]]);
          counter++;
        } else {
          arr[counter].push(phones[i]);
        }
      }
      arr.shift();
      const promiseArr = arr.map(async (item) => {
        try {
          this.options.url =
            ((conf as any).smsServer && (conf as any).smsServer.url ? (conf as any).smsServer.url : 'https://test.liquio.local') +
            '/Subscribe/SendSmsQ.php';
          this.options.method = 'POST';
          this.options.form = {
            tel: item,
            // msgid,//if OTP => msgid = undefined
            text,
            pass: (global as any).crypto
              .createHash('md5')
              .update(`${text}SaLt${item.join(',')}`)
              .digest('hex'),
          };
          // console.log(this.options);
          const t = await this.sendRequest(this.options);
          return t;
        } catch (e) {
          console.error('SMS gateway error:', summarizeError(e));
          throw e;
        }
      });
      return await Promise.all(promiseArr);
    }
  }

  async sendOneSms(phone: string, text: string, _msgid?: string): Promise<any> {
    if (!!phone == false) throw { errorCode: 400, message: 'phone empty' };

    if (!this.isEnabled) {
      const result = this.getDisabledResult(phone);
      global.log.save('send-one-sms-skipped', { phone: maskPhone(phone), text: redactMessage(text), reason: result.reason }, 'info');
      return result;
    }

    phone = phone.replace(/(\+38)?(38)?(3838)?/, '38');
    this.options.url =
      ((conf as any).smsServer && (conf as any).smsServer.url ? (conf as any).smsServer.url : 'https://test.liquio.local') +
      '/Subscribe/SendSmsQ.php';
    this.options.method = 'POST';
    this.options.form = {
      tel: phone,
      // msgid,//if OTP => msgid = undefined
      text,
      pass: (global as any).crypto.createHash('md5').update(`${text}SaLt${phone}`).digest('hex'),
    };
    const t = await this.sendRequest(this.options);
    return t;
  }

  async getSMSQueue(_clear?: unknown): Promise<any> {
    try {
      this.options.url =
        ((conf as any).smsServer && (conf as any).smsServer.url ? (conf as any).smsServer.url : 'https://test.liquio.local') +
        '/Subscribe/SmsQLog.php';
      this.options.method = 'GET';
      this.options.headers = {
        Authorization: `Bearer ${(conf as any).smsServer.access_token}`,
      };
      const t = await this.sendRequest(this.options);
      return t;
    } catch (e) {
      console.error('SMS gateway error:', summarizeError(e));
      throw e;
    }
  }

  async getSMSQueueCounter(): Promise<any> {
    try {
      this.options.url =
        ((conf as any).smsServer && (conf as any).smsServer.url ? (conf as any).smsServer.url : 'https://test.liquio.local') +
        '/Subscribe/SmsQCount.php';
      this.options.method = 'GET';
      this.options.headers = {
        Authorization: `Bearer ${(conf as any).smsServer.access_token}`,
      };
      const t = await this.sendRequest(this.options);
      return t;
    } catch (e) {
      console.error('SMS gateway error:', summarizeError(e));
      throw e;
    }
  }

  async getSMSLog(phone?: string): Promise<any> {
    try {
      this.options.url =
        ((conf as any).smsServer && (conf as any).smsServer.url ? (conf as any).smsServer.url : 'https://test.liquio.local') +
        '/Subscribe/SmsLog.php';
      this.options.method = 'GET';
      this.options.headers = {
        Authorization: `Bearer ${(conf as any).smsServer.access_token}`,
      };
      if (phone) this.options.qs = { phone };
      const t = await this.sendRequest(this.options);
      return t;
    } catch (e) {
      console.error('SMS gateway error:', summarizeError(e));
      throw e;
    }
  }

  /**
   * Remove one message from the queue. A missing id never falls back to truncating the table.
   */
  async removeFromQueue(sms_id?: string | number): Promise<any> {
    if (!sms_id) {
      throw new Error('sms_id is required, use removeAllFromQueue to clear the whole queue');
    }
    return this.destroyQueue({ where: { sms_id } });
  }

  /**
   * Explicitly remove every message from the queue.
   */
  async removeAllFromQueue(): Promise<any> {
    return this.destroyQueue({ truncate: true });
  }

  async retrySendInQueue(sms_id?: string | number): Promise<any> {
    if (!sms_id) {
      throw new Error('sms_id is required, use retrySendAllInQueue to resend the whole queue');
    }
    return this.destroyQueue({ where: { sms_id } });
  }

  async retrySendAllInQueue(): Promise<any> {
    return this.destroyQueue({ truncate: true });
  }

  private async destroyQueue(query: any): Promise<any> {
    try {
      await SmsQueue.destroy(query);

      return {
        ...(await this.getSMSQueueCounter()),
        queue: await this.getSMSQueue(),
      };
    } catch (e) {
      console.error('SMS gateway error:', summarizeError(e));
      throw e;
    }
  }
}
