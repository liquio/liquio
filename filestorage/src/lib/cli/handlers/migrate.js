const { Op } = require('sequelize');

const CliHandler = require('./handler');

const FileModel = require('../../../models/file');
const P7sSignatureModel = require('../../../models/p7s_signature');

class CliMigrateHandler extends CliHandler {
  async run() {
    global.silentUpload = true;
    this.fileModel = new FileModel();
    this.p7sSignatureModel = new P7sSignatureModel();

    this.log.write('Running migration...');
    let count;
    let totalFiles,
      currentFileIndex = 0;
    do {
      const {
        data: files,
        meta: { count: total },
      } = await this.fileModel.getAll({
        attributes: ['id', 'data', 'content_type'],
        filter: {
          data: {
            [Op.and]: {
              [Op.ne]: null,
              [Op.not]: '',
            },
          },
        },
        limit: 10,
      });

      totalFiles = totalFiles || total;

      for (const file of files) {
        currentFileIndex++;
        this.log.updateBottomBar(`Migrating file ${currentFileIndex} of ${totalFiles}...`);
        const folder = `files/D${new Date().toISOString().split('T')[0].replace(/-/g, '')}`;
        const filePath = `${folder}/${file.id}`;
        await this.fileModel.provider.uploadFile(filePath, file.contentType, file.data);
        await this.fileModel.update(file.id, { data: '', folder });
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      count = total - files.length;
    } while (count);

    totalFiles = currentFileIndex = 0;

    this.log.write('Running signature migration...');
    do {
      const {
        data: signatures,
        meta: { count: total },
      } = await this.p7sSignatureModel.getAll({
        attributes: ['id', 'p7s'],
        filter: {
          p7s: {
            [Op.and]: {
              [Op.ne]: null,
              [Op.not]: '',
            },
          },
        },
        limit: 10,
      });

      totalFiles = totalFiles || total;

      for (const signature of signatures) {
        currentFileIndex++;
        this.log.updateBottomBar(`Migrating signature ${currentFileIndex} of ${totalFiles}...`);
        const folder = `p7s/D${new Date().toISOString().split('T')[0].replace(/-/g, '')}`;
        await this.p7sSignatureModel.update(signature.id, { ...signature, folder });
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      count = total - signatures.length;
    } while (count);

    this.log.updateBottomBar('Migration complete!\n');
  }
}

module.exports = CliMigrateHandler;
