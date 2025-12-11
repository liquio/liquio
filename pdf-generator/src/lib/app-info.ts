import fs from 'fs';
import path from 'path';

import { LogLevel } from '@common/types/log.types';

import { log } from './log';

const PACKAGE_JSON_FILE_NAME = 'package.json';
const PACKAGE_JSON_FILE_ENCODING = 'utf8';

class AppInfo {
  private static instance: AppInfo;

  private _name: string;

  private _version: string;

  constructor() {
    this.init();
  }

  static getInstance() {
    if (this.instance) {
      return this.instance;
    }

    this.instance = new AppInfo();
    return this.instance;
  }

  get name() {
    return this._name;
  }

  get version() {
    return this._version;
  }

  get all() {
    return { name: this.name, version: this.version };
  }

  private init() {
    const packageJsonFilePath = path.join(process.cwd(), PACKAGE_JSON_FILE_NAME);

    let packageJsonFileData = {
      name: '',
      version: '',
    };

    try {
      const packageJsonFileContent = fs.readFileSync(packageJsonFilePath, {
        encoding: PACKAGE_JSON_FILE_ENCODING,
      });

      packageJsonFileData = JSON.parse(packageJsonFileContent);
    } catch (error) {
      log.save(
        'app-info|cannot-read-package-json-file',
        { error: error && error.message },
        LogLevel.ERROR,
      );
    }

    this._name = packageJsonFileData.name;
    this._version = packageJsonFileData.version;
  }
}

export const appInfo = new AppInfo();
