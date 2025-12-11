const moment = require('moment');
const { Op } = require('sequelize');

const FileModel = require('../../../models/file');
const P7sSignatureModel = require('../../../models/p7s_signature');
const CliHandler = require('./handler');
const FileEntity = require('../../../entities/file');

const MAXIMUM_FILES = 2000;

class CliSeparateHandler extends CliHandler {
  init() {
    global.silentUpload = true;
    this.fileModel = new FileModel();
    this.p7sSignatureModel = new P7sSignatureModel();
  }

  async getAllFiles(momentStartDate, momentEndDate) {
    return Promise.all(
      [this.fileModel, this.p7sSignatureModel].map((model) =>
        model
          .getAll({
            attributes: ['id', 'folder', ...(model instanceof P7sSignatureModel ? ['file_id'] : ['content_type'])].filter(Boolean),
            limit: 1000000000,
            filter: {
              created_at: {
                [Op.between]: [momentStartDate.startOf('day').toDate(), momentEndDate.endOf('day').toDate()],
              },
              folder: {
                [Op.and]: {
                  [Op.ne]: null,
                  [Op.not]: '',
                },
              },
            },
          })
          .then(({ data }) => data),
      ),
    ).then((results) => results.flat());
  }

  async run(startDate, endDate) {
    this.log.write('Separate command executed');
    this.init();

    let momentStartDate = moment(startDate, 'YYYY-MM-DD');
    let momentEndDate = moment(endDate || startDate, 'YYYY-MM-DD');

    if (!momentStartDate.isValid() || !momentEndDate.isValid()) {
      this.log.write('Invalid date, use format YYYY-MM-DD');
      return;
    }

    this.log.write(`Separating files from ${momentStartDate.format('YYYY-MM-DD')} to ${momentEndDate.format('YYYY-MM-DD')}`);
    const files = await this.getAllFiles(momentStartDate, momentEndDate);

    this.log.write(`Found ${files.length} files to separate`);

    const folderFileCounts = files.reduce((acc, file) => {
      if (!acc[file.folder]) {
        acc[file.folder] = 0;
      }

      acc[file.folder] += 1;
      return acc;
    }, {});

    const folders = {};

    let fileIndex = 0;
    for (const file of files) {
      fileIndex += 1;
      this.log.updateBottomBar(`Processing file ${fileIndex} of ${files.length}...`);
      if (!folders[file.folder]) {
        folders[file.folder] = [];
      }

      if (folders[file.folder].length < MAXIMUM_FILES) {
        folders[file.folder].push(file);
        continue;
      }

      const [folderBase] = file.folder.split('-');
      let folderIndex = 1;

      if (!folderFileCounts[`${folderBase}-${folderIndex}`]) {
        folderFileCounts[`${folderBase}-${folderIndex}`] = 0;
      }

      while (folderFileCounts[`${folderBase}-${folderIndex}`] >= MAXIMUM_FILES) {
        folderIndex += 1;
      }

      const fileName = file.fileId || file.id;
      const newFolder = `${folderBase}-${folderIndex}`;
      const newFilePath = `${newFolder}/${fileName}`;

      try {
        this.log.updateBottomBar(`Moving file ${fileName} to ${newFolder}...`);
        const downloadedFile = await this.fileModel.provider.downloadFileAsBuffer(`${file.folder}/${fileName}`);
        await this.fileModel.provider.uploadFile(newFilePath, file.contentType, downloadedFile);
        await this[file instanceof FileEntity ? 'fileModel' : 'p7sSignatureModel'].update(file.id, { folder: newFolder });
        await this.fileModel.provider.deleteFile(`${file.folder}/${fileName}`);

        if (!folderFileCounts[newFolder]) {
          folderFileCounts[newFolder] = 0;
        }

        folderFileCounts[newFolder] += 1;
      } catch {
        this.log.write(`Error processing file ${fileName}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.log.updateBottomBar('Separate command executed successfully\n');
  }
}

module.exports = CliSeparateHandler;
