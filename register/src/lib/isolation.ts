import moment from 'moment';
import { Context, Isolate, Reference } from 'isolated-vm';

export default class Isolation {
  private isolate: Isolate;
  private context: Context;
  private jail: any;

  constructor() {
    this.isolate = new Isolate({ memoryLimit: 128 });
    this.context = this.isolate.createContextSync();
    this.jail = this.context.global;
    // Make moment library available in isolation - use moment() directly as function
    const momentFn = moment;
    this.jail.setSync('moment', momentFn);
  }

  set(name: string, value: any): Isolation {
    this.jail.setSync(name, new Reference(value));
    return this;
  }

  eval(code: string): any {
    return this.context.evalSync(code);
  }
}
