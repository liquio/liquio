import fs from 'fs';
import path from 'path';

import Log from './log';

// Constants.
const PACKAGE_JSON_FILE_NAME = 'package.json';
const PACKAGE_JSON_FILE_ENCODING = 'utf8';

// App info.
export default class AppInfo {
  static singleton: AppInfo;
  log: Log;

  _name: string;
  _version: string;

  constructor() {
    if (!AppInfo.singleton) {
      this.log = Log.getInstance();
      this.init();
      AppInfo.singleton = this;
    }
    return AppInfo.singleton;
  }

  /**
   * Name.
   * @returns {string} App name.
   */
  get name() {
    return this._name;
  }

  /**
   * Version.
   * @returns {string} App version.
   */
  get version() {
    return this._version;
  }

  /**
   * All app info.
   * @returns {{name: string, version: string}} All app info.
   */
  get all() {
    return { name: this.name, version: this.version };
  }

  /**
   * Init.
   * @private
   */
  init() {
    // Read data from "package.json".
    const packageJsonFilePath = path.join(__dirname, '..', '..', PACKAGE_JSON_FILE_NAME);
    let packageJsonFileData: { name?: string; version?: string } = {};
    try {
      const packageJsonFileContent = fs.readFileSync(packageJsonFilePath, { encoding: PACKAGE_JSON_FILE_ENCODING });
      packageJsonFileData = JSON.parse(packageJsonFileContent);
    } catch (error) {
      this.log.save('can-not-read-package-json-file', { error: error && error.message });
    }

    // Save app info.
    this._name = packageJsonFileData.name;
    this._version = packageJsonFileData.version;
  }
}
