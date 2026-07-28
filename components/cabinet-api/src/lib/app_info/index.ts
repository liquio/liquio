import * as fs from 'fs';
import * as path from 'path';

// Constants.
const PACKAGE_JSON_FILE_NAME = path.join(process.cwd(), 'package.json');
const PACKAGE_JSON_FILE_ENCODING = 'utf8';

interface AppInfoData {
  name?: string;
  version?: string;
}

/**
 * Application info singleton
 * Reads package.json and provides app name and version
 */
export default class AppInfo {
  private static singleton: AppInfo;
  private _name?: string;
  private _version?: string;

  constructor() {
    if (!AppInfo.singleton) {
      this.init();
      AppInfo.singleton = this;
    }
    return AppInfo.singleton;
  }

  /**
   * Application name
   */
  get name(): string | undefined {
    return this._name;
  }

  /**
   * Application version
   */
  get version(): string | undefined {
    return this._version;
  }

  /**
   * All app info
   */
  get all(): AppInfoData {
    return { name: this.name, version: this.version };
  }

  /**
   * Initialize app info from package.json
   */
  private init(): void {
    const packageJsonFilePath = PACKAGE_JSON_FILE_NAME;
    let packageJsonFileData: AppInfoData = {};
    try {
      const packageJsonFileContent = fs.readFileSync(packageJsonFilePath, { encoding: PACKAGE_JSON_FILE_ENCODING });
      packageJsonFileData = JSON.parse(packageJsonFileContent);
    } catch (error) {
      console.log(error);
    }

    this._name = packageJsonFileData.name;
    this._version = packageJsonFileData.version;
  }
}
