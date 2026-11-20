import { getDb } from '../lib/context';
export class Model {
  db: any;

  constructor() {
    this.db = getDb();
  }
}
