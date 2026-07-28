import * as path from 'node:path';
import XLSX from 'xlsx';

import { Command } from '../command';

/**
 * RegenerateCommand class
 */
export class RegenerateCommand extends Command {
  constructor(yargs) {
    super(yargs, {
      name: 'regenerate-pdf',
      args: {
        '--file': {
          type: 'string',
          default: '/tmp/some-file-to-regenerate.xlsx',
          describe: 'path to xlsx file'
        }
      }
    });
  }

  /**
   *
   * @param {object} options
   * @param {string} options.file
   * @returns
   */
  async prepare({ file }: any = {}) {
    return {
      fileId: file,
      filePath: path.resolve(process.cwd(), file)
    };
  }

  /**
   *
   * @param {object} options
   * @param {string} options.filePath
   */
  async execute({ filePath, fileId }: any) {
    let data;
    try {
      data = await this.readFileData(filePath);
    } catch {
      data = [{ id: fileId }];
    }

    for (const file of data) {
      const rawDocument = await global.models.document.model.findOne({
        where: { file_id: file.id },
        include: [{ model: global.models.task.model }]
      });

      if (!rawDocument) {
        global.log.save(`cli-command-${this.name}|document-not-found`, { file_id: file.id });
        continue;
      }

      const document = {
        ...await global.models.document.prepareEntity(rawDocument),
        task: global.models.task.prepareEntity(rawDocument.task)
      };

      global.log.save(`cli-command-${this.name}|generate-pdf-start`, { file_id: file.id });
      try {
        await global.businesses.document.createPdf({ document, userId: document.createdBy });
        global.log.save(`cli-command-${this.name}|generate-pdf-end`, { file_id: file.id });
      } catch (e) {
        global.log.save(`cli-command-${this.name}|generate-pdf-error`, { message: e.message, file_id: file.id });
      }
    }
  }

  async readFileData(filePath) {
    const wb = XLSX.readFile(filePath, { type: 'array', cellDates: false });
    return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 0 });
  }
}
