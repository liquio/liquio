import fs from 'node:fs';
import path from 'node:path';

// Constants.
const PACKAGE_JSON_FILE_NAME = path.join(process.cwd(), 'package.json');
const PACKAGE_JSON_FILE_ENCODING = 'utf8';

// App info.
export class AppInfo {
  static singleton: AppInfo;

  private _name: string | undefined;
  private _version: string | undefined;

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
  get name(): string | undefined {
    return this._name;
  }

  /**
   * Version.
   * @returns {string} App version.
   */
  get version(): string | undefined {
    return this._version;
  }

  /**
   * All app info.
   * @returns {{name: string, version: string}} All app info.
   */
  get all(): { name: string | undefined; version: string | undefined } {
    return { name: this.name, version: this.version };
  }

  /**
   * Init.
   * @private
   */
  init(): void {
    // Read data from "package.json".
    const packageJsonFilePath = PACKAGE_JSON_FILE_NAME;
    let packageJsonFileData: any = {};
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
