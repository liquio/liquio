const axios = require('axios');
const conf = require('../../config/config');

const AbstractGate = class {
  constructor() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  async sendRequest(object) {
    object.json = true;
    try {
      let t = await axios(object);
      return t;
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async sendSms(phones, text, _msgid) {
    phones = phones.filter((v) => !!v == true);

    phones = phones.map((v) => v.replace(/(\+38)?(38)?(3838)?/, '38'));
    if (phones.length <= 100) {
      try {
        this.options.url = (conf.smsServer && conf.smsServer.url ? conf.smsServer.url : 'https://test.liquio.local') + '/Subscribe/SendSmsQ.php';
        this.options.method = 'POST';
        this.options.form = {
          tel: phones,
          // msgid,//if OTP => msgid = undefined
          text,
          pass: crypto
            .createHash('md5')
            .update(`${text}SaLt${phones.join(',')}`)
            .digest('hex'),
        };
        console.log(this.options);
        let t = await this.sendRequest(this.options);
        return t;
      } catch (e) {
        console.error(e);
        throw e;
      }
    } else {
      let arr = [[]],
        counter = 0;
      for (let i = 0; i < phones.length; i++) {
        if (i % 100 == 0) {
          arr.push([phones[i]]);
          counter++;
        } else {
          arr[counter].push(phones[i]);
        }
      }
      arr.shift();
      let promiseArr = arr.map(async (item) => {
        try {
          this.options.url = (conf.smsServer && conf.smsServer.url ? conf.smsServer.url : 'https://test.liquio.local') + '/Subscribe/SendSmsQ.php';
          this.options.method = 'POST';
          this.options.form = {
            tel: item,
            // msgid,//if OTP => msgid = undefined
            text,
            pass: crypto
              .createHash('md5')
              .update(`${text}SaLt${item.join(',')}`)
              .digest('hex'),
          };
          // console.log(this.options);
          let t = await this.sendRequest(this.options);
          return t;
        } catch (e) {
          console.error(e);
          throw e;
        }
      });
      return await Promise.all(promiseArr);
    }
  }

  async sendOneSms(phone, text, _msgid) {
    if (!!phone == false) throw { errorCode: 400, message: 'phone empty' };
    phone = phone.replace(/(\+38)?(38)?(3838)?/, '38');
    try {
      this.options.url = (conf.smsServer && conf.smsServer.url ? conf.smsServer.url : 'https://test.liquio.local') + '/Subscribe/SendSmsQ.php';
      this.options.method = 'POST';
      this.options.form = {
        tel: phone,
        // msgid,//if OTP => msgid = undefined
        text,
        pass: crypto.createHash('md5').update(`${text}SaLt${phone}`).digest('hex'),
      };
      let t = await this.sendRequest(this.options);
      return t;
    } catch (e) {
      throw e;
    }
  }

  async getSMSQueue(_clear) {
    try {
      this.options.url = (conf.smsServer && conf.smsServer.url ? conf.smsServer.url : 'https://test.liquio.local') + '/Subscribe/SmsQLog.php';
      this.options.method = 'GET';
      this.options.headers = {
        Authorization: `Bearer ${conf.smsServer.access_token}`,
      };
      let t = await this.sendRequest(this.options);
      return t;
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async getSMSQueueCounter() {
    try {
      this.options.url = (conf.smsServer && conf.smsServer.url ? conf.smsServer.url : 'https://test.liquio.local') + '/Subscribe/SmsQCount.php';
      this.options.method = 'GET';
      this.options.headers = {
        Authorization: `Bearer ${conf.smsServer.access_token}`,
      };
      let t = await this.sendRequest(this.options);
      return t;
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async getSMSLog(phone) {
    try {
      this.options.url = (conf.smsServer && conf.smsServer.url ? conf.smsServer.url : 'https://test.liquio.local') + '/Subscribe/SmsLog.php';
      this.options.method = 'GET';
      this.options.headers = {
        Authorization: `Bearer ${conf.smsServer.access_token}`,
      };
      if (phone) this.options.qs = { phone };
      let t = await this.sendRequest(this.options);
      return t;
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async removeFromQueue(sms_id) {
    try {
      let query = { truncate: true };
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

  async retrySendInQueue(sms_id) {
    try {
      let query = { truncate: true };
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
};

module.exports = AbstractGate;
