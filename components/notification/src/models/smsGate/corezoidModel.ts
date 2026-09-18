import crypto from 'node:crypto';
import moment from 'moment';

import { AbstractGate } from './abstractSmsGate';

const { conf } = global as any;

export class CorezoidGate extends AbstractGate {
  v1Url: string;
  v2Url: string;

  constructor() {
    super();
    this.v1Url = `https://api.corezoid.com/api/1/json/${conf.corezoidConfig.apiLogin}/`;
    this.v2Url = `https://api.corezoid.com/api/2/json/${conf.corezoidConfig.apiLogin}/`;
    this.options = {};
  }

  createSignature(content: { time: string; content: string }): string {
    let str: any = content.time + conf.corezoidConfig.apiKey + content.content + conf.corezoidConfig.apiKey;
    str = str.toString('utf8');
    let cr: any = crypto.createHash('sha1').update(str);
    cr = cr.digest('hex');
    return cr;
  }

  async sendMessageToSender(phones: string[], text: string): Promise<{ response: any; ref: string }> {
    const time = moment.utc().unix().toString();
    const content: any = { ops: [] };
    const ref = `${time}ref`;
    for (const phone of phones) {
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
    const contentString = JSON.stringify(content);
    this.options.url = this.v1Url + time + '/' + this.createSignature({ content: contentString, time });
    this.options.method = 'POST';
    this.options.form = contentString;
    this.options.headers = {
      'Content-Type': 'application/json; charset=utf8',
    };
    const response = await this.sendRequest(this.options);
    return { response, ref };
  }
}
// let t = new CorezoidGate();
// t.sendMessageToSender(['380939146338'],'Hello test')
