import { join } from 'path';

import Multiconf from 'multiconf';

const CONFIG_PATH = join(__dirname, '..', '..', 'config');

export class Config {
  private constructor() {}

  static get<T>(path: string): T {
    return Multiconf.get(CONFIG_PATH, 'KITSOFT_PDF_GENERATOR_')[path];
  }
}
