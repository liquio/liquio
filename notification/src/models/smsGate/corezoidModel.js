const AbstractGate = require('./abstractSmsGate');
let { conf } = global;
const crypto = require('crypto'),
  moment = require('moment');

const CorezoidGate = class extends AbstractGate {
  constructor() {
    super();
    this.v1Url = `https://api.corezoid.com/api/1/json/${conf.corezoidConfig.apiLogin}/`;
    this.v2Url = `https://api.corezoid.com/api/2/json/${conf.corezoidConfig.apiLogin}/`;
    this.options = {};
  }

  createSignature(content) {
    let str = content.time + conf.corezoidConfig.apiKey + content.content + conf.corezoidConfig.apiKey;
    str = str.toString('utf8');
    let cr = crypto.createHash('sha1').update(str);
    cr = cr.digest('hex');
    return cr;
  }

  async sendMessageToSender(phones, text) {
    let time = moment.utc().unix().toString(),
      content = { ops: [] },
      ref = `${time}ref`;
    for (let phone of phones) {
      content.ops.push({
        ref,
        type: 'create',
        obj: 'task',
        conv_id: conf.corezoidConfig.processId,
        data: {
          phone,
          text,
        },
      });
    }
    content = JSON.stringify(content);
    this.options.url = this.v1Url + time + '/' + this.createSignature({ content, time });
    this.options.method = 'POST';
    this.options.form = content;
    this.options.headers = {
      'Content-Type': 'application/json; charset=utf8',
    };
    try {
      let response = await this.sendRequest(this.options);
      console.log(response);
      return { response, ref };
    } catch (e) {
      throw e;
    }
  }
};
// let t = new CorezoidGate();
// t.sendMessageToSender(['380939146338'],'Hello test')

module.exports = CorezoidGate;
