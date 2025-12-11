const Sequelize = require('sequelize');
const Model = require('./model');
const P7sSignatureEntity = require('../entities/p7s_signature');

const FOLDER_NAME = 'p7s';

/**
 * Signature model.
 */
class P7sSignatureModel extends Model {
  /**
   * Constructor.
   */
  constructor(config, provider) {
    if (!P7sSignatureModel.singleton) {
      super();

      this.config = config;
      this.provider = provider;
      this.model = this.db.define(
        'p7s_signature',
        {
          id: {
            allowNull: false,
            primaryKey: true,
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV1,
          },
          file_id: {
            allowNull: false,
            type: Sequelize.UUID,
            references: { model: 'files', key: 'id' },
          },
          p7s: {
            allowNull: false,
            type: Sequelize.TEXT,
          },
          meta: {
            allowNull: false,
            type: Sequelize.JSON,
            defaultValue: {},
          },
          created_by: {
            allowNull: false,
            type: Sequelize.STRING,
          },
          updated_by: {
            allowNull: false,
            type: Sequelize.STRING,
          },
          folder: {
            allowNull: false,
            type: Sequelize.STRING,
          },
        },
        {
          tableName: 'p7s_signatures',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );
      P7sSignatureModel.singleton = this;
    }

    return P7sSignatureModel.singleton;
  }

  /**
   * Find main info by file ID.
   * @param {number} fileId File ID.
   * @returns {Promise<{data: P7sSignatureEntity}>}
   */
  async findInfoByFileId(fileId) {
    // DB query.
    const [p7sSignatureRaw] = await this.model.findAll({
      where: { file_id: fileId },
      attributes: { exclude: ['p7s'] },
    });

    if (!p7sSignatureRaw) {
      return { data: null };
    }

    const p7sSignatureEntity = new P7sSignatureEntity(p7sSignatureRaw);

    // Define and return model response.
    const modelResponse = { data: p7sSignatureEntity };
    return modelResponse;
  }

  /**
   * Find by ID.
   * @param {number} id ID.
   * @returns {Promise<{data: P7sSignatureEntity}>} Signature promise.
   */
  async findById(id) {
    // DB query.
    const signatureRaw = await this.model.findByPk(id);
    const signatureEntity = new P7sSignatureEntity(signatureRaw);

    // Use provider if need it.
    if (this.provider && signatureEntity.p7s.length === 0) {
      const { fileId, folder = FOLDER_NAME } = signatureEntity;
      let p7sData;
      try {
        p7sData = await this.provider.downloadFileAsBuffer(`${folder}/${fileId}`);
      } catch {
        //TO-DO remove after copy all files to `DYYYYMMDD` folder
        p7sData = await this.provider.downloadFileAsBuffer(`${FOLDER_NAME}/${fileId}`);
      }
      const p7sDataString = p7sData.toString('utf8');
      signatureEntity.p7s = p7sDataString;
    }

    // Define and return model response.
    const modelResponse = { data: signatureEntity };
    return modelResponse;
  }

  /**
   * Find by file ID.
   * @param {number} fileId File ID.
   * @returns {Promise<{data: P7sSignatureEntity}>} Signature promise.
   */
  async findByFileId(fileId) {
    // DB query.
    const [signatureRaw] = await this.model.findAll({ where: { file_id: fileId } });
    if (!signatureRaw) {
      return { data: null };
    }
    const signatureEntity = new P7sSignatureEntity(signatureRaw);

    // Use provider if need it.
    if (this.provider && signatureEntity.p7s.length === 0) {
      const { folder = FOLDER_NAME } = signatureEntity;
      let p7sData;
      try {
        p7sData = await this.provider.downloadFileAsBuffer(`${folder}/${fileId}`);
      } catch {
        //TO-DO remove after copy all files to `DYYYYMMDD` folder
        p7sData = await this.provider.downloadFileAsBuffer(`${FOLDER_NAME}/${fileId}`);
      }
      const p7sDataString = p7sData.toString('utf8');
      signatureEntity.p7s = p7sDataString;
    }

    // Define and return model response.
    const modelResponse = { data: signatureEntity };
    return modelResponse;
  }

  /**
   * Create.
   * @param {object} data Data object.
   * @param {string} data.fileId File ID.
   * @param {string} data.p7s P7S signature.
   * @param {string} data.meta Meta info.
   * @param {string} data.user User.
   */
  async create({ fileId, p7s, meta, user }) {
    // Prepare RAW.
    const folder = `${FOLDER_NAME}/D${new Date().toISOString().split('T')[0].replace(/-/g, '')}`;
    const signatureToCreateRaw = {
      file_id: fileId,
      p7s: this.provider ? '' : p7s,
      meta: meta,
      created_by: user,
      updated_by: user,
      folder,
    };

    // Use provider if need it.
    if (this.provider) {
      const filePath = `${folder}/${fileId}`;
      const contentType = 'text/plain';
      await this.provider.uploadFile(filePath, contentType, Buffer.from(p7s, 'utf8'));
    }

    // DB query.
    const createdSignatureRaw = await this.model.create(signatureToCreateRaw);
    const createdSignatureEntity = new P7sSignatureEntity(createdSignatureRaw);
    if (this.provider) {
      createdSignatureEntity.p7s = p7s;
    }

    // Define and return model response.
    const modelResponse = { data: createdSignatureEntity };
    return modelResponse;
  }

  /**
   * Update.
   * @param {number} id ID.
   * @param {object} data Data object.
   * @param {string} data.p7s P7S signature.
   * @param {string} data.meta Meta info.
   * @param {string} data.user User.
   */
  async update(id, { p7s, meta, user, folder }) {
    // Prepare RAW.
    const signatureToUpdateRaw = {
      p7s: this.provider ? '' : p7s,
      meta: meta,
      updated_by: user,
    };

    if (typeof folder !== 'undefined') {
      signatureToUpdateRaw.folder = folder;
    }

    // DB query.
    const [updatedRowsCount, [updatedSignatureRaw]] = await this.model.update(signatureToUpdateRaw, { where: { id }, returning: true });
    const updatedSignatureEntity = new P7sSignatureEntity(updatedSignatureRaw);

    // Use provider if need it.
    if (this.provider && p7s) {
      const { fileId, folder = FOLDER_NAME } = updatedSignatureEntity;
      const filePath = `${folder}/${fileId}`;
      const contentType = 'text/plain';
      await this.provider.uploadFile(filePath, contentType, Buffer.from(p7s, 'utf8'));
      updatedSignatureEntity.p7s = p7s;
    }

    // Define and return model response.
    const modelResponse = { data: updatedSignatureEntity, updating: { rowsCount: updatedRowsCount } };
    return modelResponse;
  }

  /**
   * Create.
   * @param {object} data Data object.
   * @param {string} data.fileId File ID.
   * @param {string} data.p7s P7S signature.
   * @param {string} data.meta Meta info.
   * @param {string} data.user User.
   */
  async createOrUpdate({ fileId, p7s, meta = {}, user }) {
    // Find existing P7S signature.
    const { data: existingP7sSignature } = await this.findByFileId(fileId);

    // Create if P7S signature not exist for defined file.
    if (!existingP7sSignature) {
      return await this.create({ fileId, p7s, meta, user });
    }

    // Update signer list.
    let signerList;
    if (meta.user) {
      signerList = existingP7sSignature.meta?.signerList?.length ? existingP7sSignature.meta.signerList : [existingP7sSignature.meta.user];
      signerList.push(meta.user);
    }

    // Update in other case.
    return await this.update(existingP7sSignature.id, {
      p7s,
      user,
      meta: {
        ...meta,
        signerList,
      },
    });
  }

  /**
   * Delete.
   * @param {number} id ID.
   * @returns {Promise<{data: number}>} Deleted rows count.
   */
  async delete(id) {
    // DB query.
    const signatureRaw = await this.model.findByPk(id);
    const deletedRowsCount = await this.model.destroy({ where: { id } });
    // Use provider if need it.
    if (this.provider) {
      const signatureEntity = new P7sSignatureEntity(signatureRaw);
      const { fileId, folder = FOLDER_NAME } = signatureEntity;
      const filePath = `${folder}/${fileId}`;
      await this.provider.deleteFile(filePath);
    }

    // Define and return model response.
    const modelResponse = { data: deletedRowsCount };
    return modelResponse;
  }

  /**
   * Delete by file Id.
   * @param {string} fileId File ID.
   * @returns {Promise<{data: number}>} Deleted rows count.
   */
  async deleteByFileId(fileId) {
    // DB query.
    const deletedRowsCount = await this.model.destroy({ where: { file_id: fileId } });

    // Define and return model response.
    const modelResponse = { data: deletedRowsCount };
    return modelResponse;
  }

  /**
   * Get P7s metadata by file Ids.
   * @param {[string]} fileIds File IDs.
   * @returns {Promise<{data: P7sSignatureEntity}>} Signature promise.
   */
  async getP7sMetadataByFileIds(fileIds) {
    // DB query.
    return await this.model.findAll({
      attributes: ['file_id', 'created_at'],
      where: { file_id: fileIds },
    });
  }

  /**
   * Get all.
   * @param {object} [options] Options.
   * @param {object} [options.filter] Filter. Sample: { name: 'abc', container_id: 1 }.
   * @param {object} [options.offset] Offset. Sample: 0.
   * @param {object} [options.limit] Limit. Sample: 20.
   * @returns {Promise<{data: FileEntity[], meta: {count, offset, limit}}>} Data with files entities and meta with pagination promise.
   */
  async getAll(options = {}) {
    // Handle options.
    const { filter, offset, limit, attributes } = { offset: 0, limit: 2, filter: {}, ...options };

    let queryOptions = {
      order: [['created_at', 'desc']],
      attributes: attributes || { exclude: ['p7s', 'preview'] },
      where: filter,
      offset,
      limit,
    };

    // DB query.
    const { count, rows: signaturesRaw } = await this.model.findAndCountAll(queryOptions);
    const signaturesEntities = signaturesRaw.map((signatureRaw) => new P7sSignatureEntity(signatureRaw));

    // Define and return model response.
    const modelResponse = { data: signaturesEntities, meta: { count, offset, limit } };
    return modelResponse;
  }
}

// Export.
module.exports = P7sSignatureModel;
