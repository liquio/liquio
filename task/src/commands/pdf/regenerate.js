const path = require('path');
const XLSX = require('xlsx');
const Command = require('../command');

/**
 * RegenerateCommand class
 */
class RegenerateCommand extends Command {
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
  async prepare({ file } = {}) {
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
  async execute({ filePath, fileId }) {
    let data;
    try {
      data = await this.readFileData(filePath);
    } catch {
      data = [{ id: fileId }];
    }

    for (const file of data) {
      const rawDocument = await models.document.model.findOne({
        where: { file_id: file.id },
        include: [{ model: models.task.model }]
      });

      if (!rawDocument) {
        log.save(`cli-command-${this.name}|document-not-found`, { file_id: file.id });
        continue;
      }

      const document = {
        ...await models.document.prepareEntity(rawDocument),
        task: models.task.prepareEntity(rawDocument.task)
      };

      log.save(`cli-command-${this.name}|generate-pdf-start`, { file_id: file.id });
      try {
        await businesses.document.createPdf({ document, userId: document.createdBy });
        log.save(`cli-command-${this.name}|generate-pdf-end`, { file_id: file.id });
      } catch (e) {
        log.save(`cli-command-${this.name}|generate-pdf-error`, { message: e.message, file_id: file.id });
      }
    }
  }

  async readFileData(filePath) {
    const wb = XLSX.readFile(filePath, { type: 'array', cellDates: false });
    return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 0 });
  }
}

module.exports = RegenerateCommand;
