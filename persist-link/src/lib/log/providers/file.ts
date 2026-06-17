// Import.
import fs from 'node:fs';
import path from 'node:path';

import LogProvider from './log_provider';

// Constants.
const DEFAULT_PROVIDER_NAME = 'file';
const LOG_FILE_EXTENSION = '.log';
const LOG_FILE_ENCODING = 'utf8';

/**
 * File log prorovider.
 */
class FileLogProvider extends LogProvider {
  /**
   * File log prorovider constructor.
   * @param {string} [name] Log provider name.
   * @param {string} [directoryPath] Directory path.
   */
  constructor(name = DEFAULT_PROVIDER_NAME, directoryPath = '') {
    // Call parent constructor.
    super(name);

    // Save params.
    this.directoryFullPath = this.isFullPath(directoryPath) ? directoryPath : path.join(__dirname, '..', '..', '..', directoryPath);
  }

  /**
   * Save.
   * @param {Date} timestamp Timestamp.
   * @param {string} type Log type.
   * @param {string} data Log data.
   */
  async save(timestamp, type, data) {
    // Define params.
    const now = new Date(timestamp);
    const nowString = now.toISOString();
    const typeString = `${type}`;
    let dataString;
    try {
      dataString = typeof data === 'object' ? JSON.stringify(data, null, 4) : `${data}`;
    } catch {
      dataString = `${data}`;
    }
    const dataToSave = `${nowString}\t${typeString}\n${dataString}\n\n`;

    // Save to file.
    const fileName = `${nowString.substring(0, 10)}${LOG_FILE_EXTENSION}`;
    const fileFullPath = path.join(this.directoryFullPath, fileName);
    fs.appendFile(fileFullPath, dataToSave, { encoding: LOG_FILE_ENCODING }, (err) => {
      if (err) {
        console.error(err);
      }
    });
  }

  /**
   * Is full path.
   * @private
   * @param {string} path Path to check.
   * @returns {boolean} Is full path indicator.
   */
  isFullPath(path) {
    // Return true if start by "/".
    if (typeof path === 'string' && path[0] === '/') {
      return true;
    }

    // Return false in other cases.
    return false;
  }
}

// Export.
export default FileLogProvider;
