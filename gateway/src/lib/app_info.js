const fs = require('fs');
const path = require('path');

// Constants.
const PACKAGE_JSON_FILE_NAME = 'package.json';
const PACKAGE_JSON_FILE_ENCODING = 'utf8';

// App info.
class AppInfo {
  constructor() {
    if (!AppInfo.singleton) {
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
    const packageJsonFilePath = path.join(process.cwd(), PACKAGE_JSON_FILE_NAME);
    let packageJsonFileData = {};
    try {
      const packageJsonFileContent = fs.readFileSync(packageJsonFilePath, { encoding: PACKAGE_JSON_FILE_ENCODING });
      packageJsonFileData = JSON.parse(packageJsonFileContent);
    } catch (error) {
      console.log(error);
    }

    // Save app info.
    this._name = packageJsonFileData.name;
    this._version = packageJsonFileData.version;
  }
}

module.exports = AppInfo;
