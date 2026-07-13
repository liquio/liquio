import { AbstractGate } from './abstractSmsGate';

/**
 * Custom gate.
 */
export class CustomGate extends AbstractGate {
  constructor() {
    // Init parent.
    super();

    // Define params.
    this.options = {};
  }

  /**
   * Send SMS.
   * @param {string[]} phones Phones list.
   * @param {string} text Text.
   * @param {string} [msgid] Message ID.
   */
  async sendSms(phones: string[], text: string, msgid?: string): Promise<any> {
    // Log.
    console.log('CustomGate - sendSms');

    if (!this.isEnabled) {
      const result = (phones || []).map((phone) => this.getDisabledResult(phone));
      global.log.save('send-sms-skipped', { phones, text, reason: 'SMS is disabled in config.' }, 'info');
      return result;
    }

    // Define adapter method.
    this.adapter = global.extensions.adapters.sms;
    if (this.adapter) {
      console.log('Custom gate initialized.');
    }
    const adapterMethod = this.adapter && this.adapter.sendSms;
    if (typeof adapterMethod !== 'function') {
      console.log('adapterMethod not a function!');
      console.log({ extensions: global.extensions });
      return;
    }

    // Send using custom adapter method.
    const adapterBindObject = this.adapter.selfBind ? this.adapter : this;
    const adapterMethodWithThisContext = adapterMethod.bind(adapterBindObject);
    let adapterResult;
    try {
      adapterResult = await adapterMethodWithThisContext(phones, text, msgid);
    } catch (error) {
      console.error(error);
    }

    // Return adapters result.
    return adapterResult;
  }

  /**
   * Send one SMS.
   * @param {string} phone Phone.
   * @param {string} text Text.
   * @param {string} msgid Message ID.
   */
  async sendOneSms(phone: string, text: string, msgid?: string): Promise<any> {
    // Log.
    console.log('CustomGate - sendOneSms');

    if (!this.isEnabled) {
      const result = this.getDisabledResult(phone);
      global.log.save('send-one-sms-skipped', { phone, text, reason: result.reason }, 'info');
      return result;
    }

    // Define adapter method.
    this.adapter = global.extensions.adapters.sms;
    if (this.adapter) {
      console.log('Custom gate initialized.');
    }
    const adapterMethod = this.adapter && this.adapter.sendOneSms;
    if (typeof adapterMethod !== 'function') {
      console.log('adapterMethod not a function!');
      console.log({ extensions: global.extensions });
      return;
    }

    // Send using custom adapter method.
    const adapterBindObject = this.adapter.selfBind ? this.adapter : this;
    const adapterMethodWithThisContext = adapterMethod.bind(adapterBindObject);
    let adapterResult;
    try {
      adapterResult = await adapterMethodWithThisContext(phone, text, msgid);
    } catch (error) {
      console.error(error);
    }

    // Return adapters result.
    return adapterResult;
  }

  /**
   * Get SMS queue.
   * @param {any} clear Clear.
   */
  async getSMSQueue(clear?: unknown): Promise<any> {
    // Log.
    console.log('CustomGate - getSMSQueue');

    // Define adapter method.
    this.adapter = global.extensions.adapters.sms;
    if (this.adapter) {
      console.log('Custom gate initialized.');
    }
    const adapterMethod = this.adapter && this.adapter.getSMSQueue;
    if (typeof adapterMethod !== 'function') {
      console.log('adapterMethod not a function!');
      console.log({ extensions: global.extensions });
      return;
    }

    // Send using custom adapter method.
    const adapterBindObject = this.adapter.selfBind ? this.adapter : this;
    const adapterMethodWithThisContext = adapterMethod.bind(adapterBindObject);
    let adapterResult;
    try {
      adapterResult = await adapterMethodWithThisContext(clear);
    } catch (error) {
      console.error(error);
    }

    // Return adapters result.
    return adapterResult;
  }

  /**
   * Get SMS queuye counter.
   */
  async getSMSQueueCounter(): Promise<any> {
    // Log.
    console.log('CustomGate - getSMSQueueCounter');

    // Define adapter method.
    this.adapter = global.extensions.adapters.sms;
    if (this.adapter) {
      console.log('Custom gate initialized.');
    }
    const adapterMethod = this.adapter && this.adapter.getSMSQueueCounter;
    if (typeof adapterMethod !== 'function') {
      console.log('adapterMethod not a function!');
      console.log({ extensions: global.extensions });
      return;
    }

    // Send using custom adapter method.
    const adapterMethodWithThisContext = adapterMethod.bind(this);
    let adapterResult;
    try {
      adapterResult = await adapterMethodWithThisContext();
    } catch (error) {
      console.error(error);
    }

    // Return adapters result.
    return adapterResult;
  }

  /**
   * Get SMS log.
   * @param {string} phone Phone.
   */
  async getSMSLog(phone: string): Promise<any> {
    // Log.
    console.log('CustomGate - getSMSLog');

    // Define adapter method.
    this.adapter = global.extensions.adapters.sms;
    if (this.adapter) {
      console.log('Custom gate initialized.');
    }
    const adapterMethod = this.adapter && this.adapter.getSMSLog;
    if (typeof adapterMethod !== 'function') {
      console.log('adapterMethod not a function!');
      console.log({ extensions: global.extensions });
      return;
    }

    // Send using custom adapter method.
    const adapterMethodWithThisContext = adapterMethod.bind(this);
    let adapterResult;
    try {
      adapterResult = await adapterMethodWithThisContext(phone);
    } catch (error) {
      console.error(error);
    }

    // Return adapters result.
    return adapterResult;
  }
}
