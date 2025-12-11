const Sequelize = require('sequelize');
const Model = require('./model');
const FileEntity = require('../entities/file');
const FileHash = require('../lib/file_hash');

const FOLDER_NAME = 'files';

/**
 * File model.
 */
class FileModel extends Model {
  /**
   * Constructor.
   * @param {object} config Config object.
   * @param {object} provider Provider.
   */
  constructor(config, provider) {
    // Singleton.
    if (!FileModel.singleton) {
      // Call parent constructor.
      super();

      // Define params.
      this.config = config;
      this.provider = provider;
      this.model = this.db.define(
        'file',
        {
          id: {
            allowNull: false,
            primaryKey: true,
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV1,
          },
          name: {
            allowNull: false,
            type: Sequelize.STRING,
          },
          content_type: {
            type: Sequelize.STRING,
          },
          content_length: {
            type: Sequelize.INTEGER,
          },
          description: {
            type: Sequelize.STRING,
          },
          container_id: {
            allowNull: false,
            type: Sequelize.INTEGER,
            references: { model: 'containers', key: 'id' },
          },
          data: {
            allowNull: false,
            type: Sequelize.BLOB,
          },
          preview: {
            allowNull: true,
            type: Sequelize.BLOB,
          },
          hash: {
            allowNull: false,
            type: Sequelize.JSON,
            defaultValue: {
              md5: null,
              sha1: null,
              sha256: null,
            },
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
          tableName: 'files',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      // Init singleton.
      FileModel.singleton = this;
    }

    // Return singleton.
    return FileModel.singleton;
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
      attributes: attributes || { exclude: ['data', 'preview'] },
      where: filter,
      offset,
      limit,
    };

    // DB query.
    const { count, rows: filesRaw } = await this.model.findAndCountAll(queryOptions);
    const filesEntities = filesRaw.map((fileRaw) => new FileEntity(fileRaw));

    // Define and return model response.
    const modelResponse = { data: filesEntities, meta: { count, offset, limit } };
    return modelResponse;
  }

  /**
   * Find by ID.
   * @param {number} id ID.
   * @returns {Promise<{data: FileEntity}>} Data with file entity promise.
   */
  async findById(id) {
    // Check.
    if (!id) throw new Error('File ID should be defined to find file entity.');

    // DB query.
    const fileRaw = await this.model.findByPk(id);
    const fileEntity = new FileEntity(fileRaw);

    if (fileEntity.data?.length === 0) {
      // If file data does not stored in DB - download data from provider.
      fileEntity.data = await this.downloadFileDataFromProvider(fileEntity);
    }

    // Actualize some file properties in DB.
    await this.updateParamsFromProvider(fileEntity, fileEntity.data);

    // Define and return model response.
    const modelResponse = { data: fileEntity };
    return modelResponse;
  }

  /**
   * Find without data by ID.
   * @param {number} id ID.
   * @returns {Promise<{data: FileEntity}>} Data with file promise.
   */
  async findWithoutDataById(id) {
    // DB query.
    const fileRaw = await this.model.findByPk(id, { attributes: { exclude: ['data'] } });
    const fileEntity = new FileEntity(fileRaw);

    // Actualize some file properties in DB.
    await this.updateParamsFromProvider(fileEntity);

    // Define and return model response.
    const modelResponse = { data: fileEntity };
    return modelResponse;
  }

  /**
   * Find main info by ID.
   * @param {number} id ID.
   * @returns {Promise<{data: FileEntity}>} Data with file entity promise.
   */
  async findInfoById(id) {
    // DB query.
    const fileRaw = await this.model.findByPk(id, { attributes: { exclude: ['data', 'preview'] } });
    const fileEntity = new FileEntity(fileRaw);

    // Actualize some file properties in DB.
    await this.updateParamsFromProvider(fileEntity);

    // Define and return model response.
    const modelResponse = { data: fileEntity };
    return modelResponse;
  }

  /**
   * Create.
   * @param {object} data Data object.
   * @param {string} data.name Name.
   * @param {string} data.contentType Content-type. Sample: "application/pdf".
   * @param {number} data.contentLength Content-length.
   * @param {string} data.description Description.
   * @param {number} data.containerId Container ID.
   * @param {Buffer} data.data Data buffer.
   * @param {Buffer} data.preview Data buffer.
   * @param {{md5, sha1, sha256}} data.hash Hash.
   * @param {string} data.meta Meta info.
   * @param {string} data.user User.
   * @returns {Promise<{data: FileEntity}>} Data with created file entity promise.
   */
  async create({ name, contentType, contentLength, description, containerId, data, preview, hash, meta, user }) {
    // Prepare RAW.
    const folder = `${FOLDER_NAME}/D${new Date().toISOString().split('T')[0].replace(/-/g, '')}`;
    const fileToCreateRaw = {
      name: name,
      content_type: contentType,
      content_length: contentLength,
      description: description,
      container_id: containerId,
      data: this.provider ? Buffer.from([]) : data,
      preview: preview,
      hash: hash,
      meta: meta,
      created_by: user,
      updated_by: user,
      folder,
    };

    // DB query.
    const createdFileRaw = await this.model.create(fileToCreateRaw);
    const createdFileEntity = new FileEntity(createdFileRaw, true);

    // Use provider if need it.
    if (this.provider) {
      const { id: fileId } = createdFileEntity;
      const filePath = `${folder}/${fileId}`;
      await this.provider.uploadFile(filePath, contentType, data);
    }

    // Define and return model response.
    const modelResponse = { data: createdFileEntity };
    return modelResponse;
  }

  /**
   * Update.
   * @param {number} id ID.
   * @param {object} data Data object.
   * @param {string} data.name Name.
   * @param {string} data.description Description.
   * @param {number} data.containerId Container ID.
   * @param {string} data.meta Meta info.
   * @param {string} data.user User.
   * @param {{md5, sha1, sha256}} data.hash Hash.
   * @param {number} contentLength Content length.
   */
  async update(id, { name, description, containerId, meta, user, hash, contentLength, data, folder }) {
    // Check.
    if (!id) throw new Error('File ID should be defined to update file entity.');

    // Prepare RAW.
    const fileToUpdateRaw = {};
    if (typeof name !== 'undefined') fileToUpdateRaw.name = name;
    if (typeof description !== 'undefined') fileToUpdateRaw.description = description;
    if (typeof containerId !== 'undefined') fileToUpdateRaw.container_id = containerId;
    if (typeof meta !== 'undefined') fileToUpdateRaw.meta = meta;
    if (typeof user !== 'undefined') fileToUpdateRaw.updated_by = user;
    if (typeof hash !== 'undefined') fileToUpdateRaw.hash = hash;
    if (typeof contentLength !== 'undefined') fileToUpdateRaw.content_length = contentLength;
    if (typeof data !== 'undefined') fileToUpdateRaw.data = data;
    if (typeof folder !== 'undefined') fileToUpdateRaw.folder = folder;

    // DB query.
    const [updatedRowsCount, [updatedFileRaw]] = await this.model.update(fileToUpdateRaw, { where: { id }, returning: true });
    const updatedFileEntity = new FileEntity(updatedFileRaw, true);

    // Define and return model response.
    const modelResponse = { data: updatedFileEntity, updating: { rowsCount: updatedRowsCount } };
    return modelResponse;
  }

  /**
   * Delete.
   * @param {number} id ID.
   * @returns {Promise<{data: number}>} Data with deleted rows count promise.
   */
  async delete(id) {
    // DB query.
    const fileRaw = await this.model.findByPk(id);
    const folder = fileRaw?.folder || FOLDER_NAME;

    const deletedRowsCount = await this.model.destroy({ where: { id } });

    // Use provider if need it.
    if (this.provider) {
      await this.provider.deleteFile(`${folder}/${id}`);
    }

    // Define and return model response.
    const modelResponse = { data: deletedRowsCount };
    return modelResponse;
  }

  /**
   * Copy.
   * @param {string} id Original file ID.
   * @returns {Promise<{data: FileEntity}>} Data with new file entity promise.
   */
  async copy(id) {
    // DB query to get original file.
    const originalFileModelResponse = await this.findById(id);
    const { data: originalFileEntity } = originalFileModelResponse;

    // Save as new file.
    const user = originalFileEntity.createdBy;
    const copyFileModelResponse = await this.create({ ...originalFileEntity, user });

    // Return model response.
    return copyFileModelResponse;
  }

  /**
   * @private
   * @param {FileEntity} fileEntity File.
   * @return {Promise<FileEntity.data>}
   */
  async downloadFileDataFromProvider(fileEntity) {
    if (!this.provider) {
      // If there is no active provider.
      throw new Error('FileModel.downloadFileDataFromProvider. Cannot download file from provider. No active providers.');
    }

    let data;
    try {
      data = await this.provider.downloadFileAsBuffer(`${fileEntity.folder}/${fileEntity.id}`, fileEntity);
    } catch {
      // Do nothing.
    }

    //TO-DO remove after copy all files to `DYYYYMMDD` folder.
    if (!data) {
      try {
        data = await this.provider.downloadFileAsBuffer(`${FOLDER_NAME}/${fileEntity.id}`, fileEntity);
      } catch {
        // Do nothing.
      }
    }

    if (!data) {
      throw new Error('FileModel.downloadFileDataFromProvider. Cannot download file from provider. File not found.');
    }

    return data;
  }

  /**
   * @private
   * @param {FileEntity} fileEntity File.
   * @param {FileEntity.data} [fileData] Optional file data.
   * @return {Promise<void>}
   */
  async updateParamsFromProvider(fileEntity, fileData) {
    if (!this.provider) {
      // Skip if there is no active providers.
      return;
    }

    if (!fileData) {
      fileData = await this.downloadFileDataFromProvider(fileEntity);
    }

    const updateParams = {};

    const isNeedUpdateHash = !fileEntity.hash || !fileEntity.hash.sha256;
    if (isNeedUpdateHash) {
      const fileHash = new FileHash(fileData);
      const hash = fileHash.calc();
      fileEntity.hash = hash;
      updateParams.hash = hash;
    }

    const isNeedUpdateContentLength = typeof fileEntity.contentLength === 'undefined';
    if (isNeedUpdateContentLength) {
      const contentLength = fileData.length;
      fileEntity.contentLength = contentLength;
      updateParams.contentLength = contentLength;
    }

    if (Object.keys(updateParams).length > 0) {
      await this.update(fileEntity.id, updateParams);
    }
  }
}

// Export.
module.exports = FileModel;
