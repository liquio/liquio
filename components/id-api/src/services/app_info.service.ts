import { AppInfo } from '@liquio/back-core';

import { BaseService } from './base_service';

export class AppInfoService extends BaseService {
  public readonly name: string;
  public readonly version: string;

  constructor(...args: ConstructorParameters<typeof BaseService>) {
    super(...args);

    try {
      const appInfo = new AppInfo();
      if (!appInfo.name || !appInfo.version) {
        throw new Error('package.json is missing a name or version field.');
      }
      this.name = appInfo.name;
      this.version = appInfo.version;
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
