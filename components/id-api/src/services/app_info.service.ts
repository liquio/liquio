import path from 'path';
import fs from 'fs';

import { BaseService } from './base_service';

export class AppInfoService extends BaseService {
  public readonly name: string;
  public readonly version: string;

  constructor(...args: ConstructorParameters<typeof BaseService>) {
    super(...args);

    try {
      const raw = fs.readFileSync(path.join(process.cwd(), 'package.json'), {
        encoding: 'utf8',
      });
      const { name, version } = JSON.parse(raw);
      this.name = name;
      this.version = version;
    } catch (error: any) {
      this.log.save('app-info-read-package-json-error', { error: error.toString() }, 'error');
      throw new Error(`Can not read package.json file: ${error}`);
    }
  }

  get all() {
    return {
      name: this.name,
      version: this.version,
    };
  }
}
