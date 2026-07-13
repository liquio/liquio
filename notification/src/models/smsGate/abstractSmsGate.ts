import axios from 'axios';
import conf from '../../config/config';
import { SmsQueueModel } from '../sms_queue';

const SmsQueue = new SmsQueueModel().SmsQueue;

export class AbstractGate {
  options: any;
  adapter: any;

  constructor() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  get isEnabled(): boolean {
    return !(conf as any).smsServer || (conf as any).smsServer.isEnabled !== false;
  }

  getDisabledResult(target: unknown): { skipped: boolean; reason: string; target: unknown } {
    return { skipped: true, reason: 'SMS is disabled in config.', target };
  }

  async sendRequest(object: any): Promise<any> {
    object.json = true;
    try {
      const t = await axios(object);
      return t;
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async sendSms(phones: string[], text: string, _msgid?: string): Promise<any> {
    phones = phones.filter((v) => !!v == true);

    if (!this.isEnabled) {
      const result = phones.map((phone) => this.getDisabledResult(phone));
      global.log.save('send-sms-skipped', { phones, text, reason: 'SMS is disabled in config.' }, 'info');
      return result;
    }

    phones = phones.map((v) => v.replace(/(\+38)?(38)?(3838)?/, '38'));
    if (phones.length <= 100) {
      try {
        this.options.url = ((conf as any).smsServer && (conf as any).smsServer.url ? (conf as any).smsServer.url : 'https://test.liquio.local') + '/Subscribe/SendSmsQ.php';
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
        console.log(this.options);
        const t = await this.sendRequest(this.options);
        return t;
      } catch (e) {
        console.error(e);
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
          this.options.url = ((conf as any).smsServer && (conf as any).smsServer.url ? (conf as any).smsServer.url : 'https://test.liquio.local') + '/Subscribe/SendSmsQ.php';
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
          console.error(e);
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
      global.log.save('send-one-sms-skipped', { phone, text, reason: result.reason }, 'info');
      return result;
    }

    phone = phone.replace(/(\+38)?(38)?(3838)?/, '38');
    this.options.url = ((conf as any).smsServer && (conf as any).smsServer.url ? (conf as any).smsServer.url : 'https://test.liquio.local') + '/Subscribe/SendSmsQ.php';
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
      this.options.url = ((conf as any).smsServer && (conf as any).smsServer.url ? (conf as any).smsServer.url : 'https://test.liquio.local') + '/Subscribe/SmsQLog.php';
      this.options.method = 'GET';
      this.options.headers = {
        Authorization: `Bearer ${(conf as any).smsServer.access_token}`,
      };
      const t = await this.sendRequest(this.options);
      return t;
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async getSMSQueueCounter(): Promise<any> {
    try {
      this.options.url = ((conf as any).smsServer && (conf as any).smsServer.url ? (conf as any).smsServer.url : 'https://test.liquio.local') + '/Subscribe/SmsQCount.php';
      this.options.method = 'GET';
      this.options.headers = {
        Authorization: `Bearer ${(conf as any).smsServer.access_token}`,
      };
      const t = await this.sendRequest(this.options);
      return t;
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async getSMSLog(phone?: string): Promise<any> {
    try {
      this.options.url = ((conf as any).smsServer && (conf as any).smsServer.url ? (conf as any).smsServer.url : 'https://test.liquio.local') + '/Subscribe/SmsLog.php';
      this.options.method = 'GET';
      this.options.headers = {
        Authorization: `Bearer ${(conf as any).smsServer.access_token}`,
      };
      if (phone) this.options.qs = { phone };
      const t = await this.sendRequest(this.options);
      return t;
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async removeFromQueue(sms_id?: string): Promise<any> {
    try {
      let query: any = { truncate: true };
      if (sms_id) {
        query = {
          where: {
            sms_id,
          },
        };
      }
      await SmsQueue.destroy(query);

      return {
        ...(await this.getSMSQueueCounter()),
        queue: await this.getSMSQueue(),
      };
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async retrySendInQueue(sms_id?: string): Promise<any> {
    try {
      let query: any = { truncate: true };
      if (sms_id) {
        query = {
          where: {
            sms_id,
          },
        };
      }
      await SmsQueue.destroy(query);

      return {
        ...(await this.getSMSQueueCounter()),
        queue: await this.getSMSQueue(),
      };
    } catch (e) {
      console.error(e);
      throw e;
    }
  }
}
