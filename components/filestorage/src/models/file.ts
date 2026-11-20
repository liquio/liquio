import Sequelize from 'sequelize';

import { Model } from './model';
import { FileEntity } from '../entities/file';
import { FileHash } from '../lib/file_hash';
import { getLog } from '../lib/context';

const FOLDER_NAME = 'files';
const NOT_FOUND_STATUS = 404;
const NOT_FOUND_CODES = ['NoSuchKey', 'NotFound', 'ENOENT'];
const NOT_FOUND_MESSAGE_REGEXP = /NoSuchKey|\b404\b|not found/i;

/**
 * Is provider "object not found" error (OpenStack 404, MinIO NoSuchKey/404).
 * @param {any} error Error.
 * @returns {boolean}
 */
function isProviderNotFoundError(error: any): boolean {
  if (!error) return false;
  const status = error.statusCode ?? error.status ?? error.response?.status;
  if (status === NOT_FOUND_STATUS) return true;
  if (NOT_FOUND_CODES.includes(error.code)) return true;
  return NOT_FOUND_MESSAGE_REGEXP.test(String(error.message || ''));
}

/**
 * File model.
 */
export class FileModel extends Model {
  static singleton: FileModel;

  provider: any;

  /**
   * Constructor.
   * @param {object} config Config object.
   * @param {object} provider Provider.
   */
  constructor(config?: any, provider?: any) {
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
  async getAll(options: any = {}) {
    // Handle options.
    const { filter, offset, limit, attributes } = { offset: 0, limit: 2, filter: {}, ...options };

    const queryOptions: any = {
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

      // Verify downloaded bytes against stored hash.
      this.verifyIntegrity(fileEntity, fileEntity.data);
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
  async update(id, { name, description, containerId, meta, user, hash, contentLength, data, folder }: any) {
    // Check.
    if (!id) throw new Error('File ID should be defined to update file entity.');

    // Prepare RAW.
    const fileToUpdateRaw: any = {};
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
    const fileRaw: any = await this.model.findByPk(id);
    const folder = fileRaw?.folder || FOLDER_NAME;

    // Use provider if need it. Delete the object first: if it fails the DB row stays and delete can be retried.
    if (this.provider) {
      try {
        await this.provider.deleteFile(`${folder}/${id}`);
      } catch (error: any) {
        // Object already absent is the desired state.
        if (!isProviderNotFoundError(error)) {
          getLog().save('file-provider-delete-error', { id, error: error && error.message });
          throw error;
        }
      }
    }

    const deletedRowsCount = await this.model.destroy({ where: { id } });

    // Define and return model response.
    const modelResponse = { data: deletedRowsCount };
    return modelResponse;
  }

  /**
   * Copy.
   * @param {string} id Original file ID.
   * @param {string} [user] Authenticated caller to record as creator of the copy. Defaults to the original author (CLI use).
   * @returns {Promise<{data: FileEntity}>} Data with new file entity promise.
   */
  async copy(id, user?: string) {
    // DB query to get original file.
    const originalFileModelResponse = await this.findById(id);
    const { data: originalFileEntity } = originalFileModelResponse;

    // Save as new file.
    const copyUser = user ?? originalFileEntity.createdBy;
    const meta = { ...(originalFileEntity.meta || {}), copiedFrom: { id: originalFileEntity.id, createdBy: originalFileEntity.createdBy } };
    const copyFileModelResponse = await this.create({ ...originalFileEntity, meta, user: copyUser });

    // Return model response.
    return copyFileModelResponse;
  }

  /**
   * Verify bytes returned by provider against stored sha256. Legacy rows without hash are skipped.
   * @private
   * @param {FileEntity} fileEntity File.
   * @param {Buffer} fileData Data downloaded from provider.
   */
  verifyIntegrity(fileEntity, fileData) {
    if (this.config?.app?.verifyIntegrity === false) return;

    const storedSha256 = fileEntity.hash?.sha256;
    if (!storedSha256) return;

    const { sha256 } = new FileHash(fileData).calc();
    if (sha256 !== storedSha256) {
      getLog().save('file-integrity-error', { id: fileEntity.id });
      throw new Error('FileModel.verifyIntegrity. File integrity check failed.');
    }
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
  async updateParamsFromProvider(fileEntity, fileData?) {
    if (!this.provider) {
      // Skip if there is no active providers.
      return;
    }

    if (!fileData) {
      fileData = await this.downloadFileDataFromProvider(fileEntity);
    }

    const updateParams: any = {};

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
