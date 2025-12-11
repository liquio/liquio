const Sequelize = require('sequelize');
const Model = require('./model');
const SignatureEntity = require('../entities/signature');

/**
 * Signature model.
 */
class SignatureModel extends Model {
  /**
   * Constructor.
   */
  constructor() {
    if (!SignatureModel.singleton) {
      super();

      this.model = this.db.define(
        'signature',
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
          signed_data: {
            allowNull: false,
            type: Sequelize.TEXT,
          },
          signature: {
            allowNull: false,
            type: Sequelize.TEXT,
          },
          certificate: {
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
        },
        {
          tableName: 'signatures',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );
      SignatureModel.singleton = this;
    }

    return SignatureModel.singleton;
  }

  /**
   * Get all.
   * @param {object} [options] Options.
   * @param {object} [options.filter] Filter. Sample: { file_id: 'abc' }.
   * @param {object} [options.offset] Offset. Sample: 0.
   * @param {object} [options.limit] Limit. Sample: 20.
   * @returns {Promise<{data: SignatureEntity[], meta: {count, offset, limit}}>} Signatures promise.
   */
  async getAll(options = {}) {
    // Handle options.
    const { filter, offset, limit } = { offset: 0, limit: 2, filter: {}, ...options };
    let queryOptions = { order: [['created_at', 'desc']], where: filter, offset, limit };

    // DB query.
    const { count, rows: signaturesRaw } = await this.model.findAndCountAll(queryOptions);
    const signaturesEntities = signaturesRaw.map((signatureRaw) => new SignatureEntity(signatureRaw));

    // Define and return model response.
    const modelResponse = { data: signaturesEntities, meta: { count, offset, limit } };
    return modelResponse;
  }

  /**
   * Find by ID.
   * @param {number} id ID.
   * @returns {Promise<{data: SignatureEntity}>} Signature promise.
   */
  async findById(id) {
    // DB query.
    const signatureRaw = await this.model.findByPk(id);
    const signatureEntity = new SignatureEntity(signatureRaw);

    // Define and return model response.
    const modelResponse = { data: signatureEntity };
    return modelResponse;
  }

  /**
   * Create.
   * @param {object} data Data object.
   * @param {string} data.fileId File ID.
   * @param {string} data.signedData Signed data.
   * @param {string} data.signature Signature.
   * @param {string} data.certificate Certificate.
   * @param {string} data.meta Meta info.
   * @param {string} data.user User.
   */
  async create({ fileId, signedData, signature, certificate, meta, user }) {
    // Prepare RAW.
    const signatureToCreateRaw = {
      file_id: fileId,
      signed_data: signedData,
      signature: signature,
      certificate: certificate,
      meta: meta,
      created_by: user,
      updated_by: user,
    };

    // DB query.
    const createdSignatureRaw = await this.model.create(signatureToCreateRaw);
    const createdSignatureEntity = new SignatureEntity(createdSignatureRaw);

    // Define and return model response.
    const modelResponse = { data: createdSignatureEntity };
    return modelResponse;
  }

  /**
   * Update.
   * @param {number} id ID.
   * @param {object} data Data object.
   * @param {string} data.fileId File ID.
   * @param {string} data.signedData Signed data.
   * @param {string} data.signature Signature.
   * @param {string} data.certificate Certificate.
   * @param {string} data.meta Meta info.
   * @param {string} data.user User.
   */
  async update(id, { fileId, signedData, signature, certificate, meta, user }) {
    // Prepare RAW.
    const signatureToUpdateRaw = {
      file_id: fileId,
      signed_data: signedData,
      signature: signature,
      certificate: certificate,
      meta: meta,
      updated_by: user,
    };

    // DB query.
    const [updatedRowsCount, [updatedSignatureRaw]] = await this.model.update(signatureToUpdateRaw, { where: { id }, returning: true });
    const updatedSignatureEntity = new SignatureEntity(updatedSignatureRaw);

    // Define and return model response.
    const modelResponse = { data: updatedSignatureEntity, updating: { rowsCount: updatedRowsCount } };
    return modelResponse;
  }

  /**
   * Delete.
   * @param {number} id ID.
   * @returns {Promise<{data: number}>} Deleted rows count.
   */
  async delete(id) {
    // DB query.
    const deletedRowsCount = await this.model.destroy({ where: { id } });

    // Define and return model response.
    const modelResponse = { data: deletedRowsCount };
    return modelResponse;
  }

  /**
   * Delete by file ID.
   * @param {number} fileId File ID.
   * @returns {Promise<{data: number}>} Deleted rows count.
   */
  async deleteByFileId(fileId) {
    // DB query.
    const deletedRowsCount = await this.model.destroy({ where: { file_id: fileId } });

    // Define and return model response.
    const modelResponse = { data: deletedRowsCount };
    return modelResponse;
  }
}

// Export.
module.exports = SignatureModel;
