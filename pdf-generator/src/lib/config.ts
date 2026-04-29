import { join } from 'path';
import { existsSync } from 'fs';

import Multiconf from 'multiconf';

const CONFIG_PATH = join(__dirname, '..', '..', 'config');
const SECRET_PATH = process.env.SECRET_PATH;

export class Config {
  private constructor() {}

  static get<T>(path: string): T {
    return (Multiconf.get(
      [CONFIG_PATH, ...(SECRET_PATH && existsSync(SECRET_PATH) ? [SECRET_PATH] : [])],
      'KITSOFT_PDF_GENERATOR_',
    ) as Record<string, unknown>)[path] as T;
  }
}
