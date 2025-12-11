const AdmZip = require('adm-zip');
const JSZip = require('jszip');
const translit = require('ua-en-translit');
const mime = require('mime-types');

const Controller = require('./controller');
const P7sSignatureEntity = require('../entities/p7s_signature');
const FileModel = require('../models/file');
const SignatureModel = require('../models/signature');
const P7sSignatureModel = require('../models/p7s_signature');
const Stream = require('../lib/stream');
const FileHash = require('../lib/file_hash');
const Preview = require('../lib/preview');
const AsicManifest = require('../lib/asicmanifest');

/**
 * Files controller.
 * @typedef {import('../entities/file')} FileEntity
 */
class FilesController extends Controller {
  /**
   * Files controller constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!FilesController.singleton) {
      super(config);
      this.fileModel = new FileModel();
      this.signatureModel = new SignatureModel();
      this.p7sSignatureModel = new P7sSignatureModel();
      this.preview = new Preview();
      FilesController.singleton = this;
    }
    return FilesController.singleton;
  }

  /**
   * Get all.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getAll(req, res) {
    // Define params.
    const { offset, limit, name, container_id } = { offset: 0, limit: 20, ...req.query };
    let filter = {};
    if (name) {
      filter.name = name;
    }
    if (container_id) {
      filter.container_id = parseInt(container_id);
    }

    // Get files.
    let filesModelResponse;
    try {
      filesModelResponse = await this.fileModel.getAll({
        offset: parseInt(offset),
        limit: Math.min(parseInt(limit), this.config.pagination.maxLimit),
        filter,
      });
    } catch (error) {
      log.save('get-files-error', { error: error && error.message });
    }
    const { data: files, meta } = filesModelResponse || {};

    // Response.
    this.responseData(res, files, meta);
  }

  /**
   * Find by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async findInfoById(req, res) {
    // Define params.
    const { id } = req.params;

    // Get file.
    let fileModelResponse;
    try {
      fileModelResponse = await this.fileModel.findInfoById(id);
    } catch (error) {
      log.save('get-file-main-info-by-id-error', { error: error && error.message });
    }
    const { data: file } = fileModelResponse || {};

    // Check.
    if (!file) {
      return this.responseError(res, 'Not found.', 404);
    }

    // Response.
    this.responseData(res, file);
  }

  /**
   * Download.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async download(req, res) {
    // Define params.
    const { id } = req.params;

    // Get file.
    let fileModelResponse;
    try {
      fileModelResponse = await this.fileModel.findById(id);
    } catch (error) {
      log.save('get-file-by-id-error', { error: error && error.message });
    }
    const { data: file } = fileModelResponse || {};

    // Check.
    if (!file) {
      return this.responseError(res, 'Not found.', 404);
    }

    // Response.
    this.responseFile(res, file.data, file.contentType, undefined, file.name);
  }

  /**
   * Download preview.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async downloadPreview(req, res) {
    // Define params.
    const { id } = req.params;

    // Get file.
    let fileModelResponse;
    try {
      fileModelResponse = await this.fileModel.findWithoutDataById(id);
    } catch (error) {
      log.save('get-file-by-id-error', { error: error && error.message });
    }
    const { data: file } = fileModelResponse || {};

    // Check.
    if (!file) {
      return this.responseError(res, 'Not found.', 404);
    }
    if (!file.preview) {
      return this.responseError(res, 'Preview not found.', 404);
    }

    // Response.
    this.responseFile(res, file.preview, Preview.ContentType, undefined);
  }

  /**
   * Download ZIP.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async downloadZip(req, res) {
    // Define params.
    const { ids } = req.params;
    const filesIds = ids.split(',');

    // Define ZIP.
    const zip = new AdmZip();

    // Get files.
    let iterator = 1;
    for (const id of filesIds) {
      // Get file.
      let fileModelResponse;
      try {
        fileModelResponse = await this.fileModel.findById(id);
      } catch (error) {
        log.save('get-file-by-id-error', { error: error && error.message });
      }
      const { data: file } = fileModelResponse || {};

      // Check.
      if (!file) {
        return this.responseError(res, 'Not found.', 404);
      }

      // Add file to ZIP archive.
      zip.addFile(`${iterator}-${file.name}`, Buffer.from(file.data), file.contentType);
      iterator++;
    }

    // Save ZIP content.
    const zipContent = zip.toBuffer();

    // Response.
    this.responseFile(res, zipContent, 'application/zip');
  }

  /**
   * Upload archive.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   * @returns {Promise<void>}
   */
  async uploadArchive(req, res) {
    // Define params.
    const { description, container_id: containerId = 1, meta: metaBase64 } = req.query;
    let meta;
    if (metaBase64) {
      try {
        meta = JSON.parse(Buffer.from(metaBase64, 'base64').toString('utf8'));
      } catch {
        return this.responseError(res, 'Can not parse meta as BASE64 of JSON string.', 400);
      }
    }

    // Read from stream.
    let archiveContentBuffer;
    let chunks = [];
    req.on('data', (data) => chunks.push(data));
    req.on('end', () => {
      archiveContentBuffer = Buffer.concat(chunks);
    });
    await Stream.waitEndEvent(req);

    // Check size.
    if (archiveContentBuffer.length === 0) {
      log.save('upload-empty-file');
      return this.responseError(res, 'Can not upload empty file.', 400);
    }

    // Define ZIP.
    let zip;
    try {
      zip = new AdmZip(archiveContentBuffer);
    } catch (error) {
      log.save('parse-archive-error', { error: error && error.message });
      return this.responseError(res, 'Can not parse archive.', 400);
    }

    // Get files.
    const zipEntries = zip.getEntries();
    const files = [];

    for (const zipEntry of zipEntries) {
      if (zipEntry.isDirectory) {
        continue;
      }

      const name = zipEntry.entryName;
      const content = zipEntry.getData();
      const contentType = mime.lookup(name) || 'application/octet-stream';
      const contentLength = content.length;

      // Check size.
      if (content.length === 0) {
        log.save('upload-empty-file', { name });
        return this.responseError(res, 'Can not upload empty file.', 400);
      }

      // Calc hash.
      const fileHash = new FileHash(content);
      const hash = fileHash.calc();

      // Create file.
      let fileModelResponse;
      try {
        fileModelResponse = await this.fileModel.create({
          name,
          contentType,
          contentLength,
          description,
          containerId,
          data: content,
          preview: null,
          hash,
          meta,
          user: req.auth.user,
        });
      } catch (error) {
        log.save('upload-file-error', { error: error && error.message });
      }
      const { data: file } = fileModelResponse || {};

      // Check.
      if (!file) {
        return this.responseError(res, 'Can not upload.', 500);
      }

      // Add file to files container.
      files.push(file);
    }

    // Response.
    this.responseData(res, files);
  }

  /**
   * Upload.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async upload(req, res) {
    // Define params.
    const { description, container_id: containerId, meta: metaBase64, is_set_extension: isSetExtension, with_preview = 'true' } = req.query;
    const withPreview = with_preview === 'false' ? false : true;
    let { name } = req.query;
    let meta;
    if (metaBase64) {
      try {
        meta = JSON.parse(Buffer.from(metaBase64, 'base64').toString('utf8'));
      } catch {
        return this.responseError(res, 'Can not parse meta as BASE64 of JSON string.', 400);
      }
    }
    let { 'content-type': contentType, 'content-length': contentLength } = req.headers;
    const { user } = req.auth;

    if (isSetExtension === 'true') {
      name += `.${mime.extension(contentType)}`;
    }

    // Read from stream.
    let fileContentBuffer;
    let chunks = [];
    req.on('data', (data) => chunks.push(data));
    req.on('end', () => {
      fileContentBuffer = Buffer.concat(chunks);
    });
    await Stream.waitEndEvent(req);

    if (!contentLength) {
      contentLength = fileContentBuffer.length;
    }

    // Check size.
    if (fileContentBuffer.length === 0) {
      log.save('upload-empty-file', { name });
      return this.responseError(res, 'Can not upload empty file.', 400);
    }

    // Calc hash.
    const fileHash = new FileHash(fileContentBuffer);
    const hash = fileHash.calc();

    // Try to get preview if allowed.
    let previewContent;
    if (withPreview && this.preview.isPreviewAllowed(contentType)) {
      try {
        previewContent = await this.preview.getPreview(fileContentBuffer, name);
      } catch (error) {
        log.save('preview-generating-error', { name, containerId, error: error && error.message });
        previewContent = undefined;
      }
    }

    // Create file.
    let fileModelResponse;
    try {
      fileModelResponse = await this.fileModel.create({
        name,
        contentType,
        contentLength,
        description,
        containerId,
        data: fileContentBuffer,
        preview: previewContent,
        hash,
        meta,
        user,
      });
    } catch (error) {
      log.save('upload-file-error', { error: error && error.message });
    }
    const { data: file } = fileModelResponse || {};

    // Check.
    if (!file) {
      return this.responseError(res, 'Can not upload.', 500);
    }

    // Response.
    this.responseData(res, file);
  }

  /**
   * Update.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async update(req, res) {
    // Define params.
    const { id } = req.params;
    const { name, description, containerId, meta } = req.body;
    const { user } = req.auth;

    // Update file.
    let fileModelResponse;
    try {
      fileModelResponse = await this.fileModel.update(id, { name, description, containerId, meta, user });
    } catch (error) {
      log.save('update-file-error', { error: error && error.message });
    }
    const { data: file } = fileModelResponse || {};

    // Check.
    if (!file) {
      return this.responseError(res, 'Can not update.', 500);
    }

    // Response.
    this.responseData(res, file);
  }

  /**
   * Delete.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async delete(req, res) {
    // Define params.
    const { id } = req.params;

    // Delete file.
    let deletedRowsCountModelResponse;
    try {
      deletedRowsCountModelResponse = await this.fileModel.delete(id);
    } catch (error) {
      log.save('delete-file-error', { error: error && error.message });
    }
    const { data: deletedRowsCount } = deletedRowsCountModelResponse || {};

    // Check.
    if (typeof deletedRowsCount === 'undefined' || deletedRowsCount === 0) {
      return this.responseError(res, 'Can not delete.', 500);
    }

    // Response.
    this.responseData(res, { deletedRowsCount });
  }

  /**
   * Copy.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async copy(req, res) {
    // Define params.
    const { id } = req.params;

    // Copy file.
    let fileCopyModelResponse;
    try {
      fileCopyModelResponse = await this.fileModel.copy(id);
    } catch (error) {
      log.save('copy-file-error', { error: error && error.message });
    }
    const { data: fileCopy } = fileCopyModelResponse || {};

    // Check.
    if (!fileCopy) {
      return this.responseError(res, 'Not found.', 404);
    }

    // Response.
    this.responseData(res, fileCopy);
  }

  /**
   * Get P7S signature by file ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getP7sSignatureByFileId(req, res) {
    // Define params.
    const { id: fileId } = req.params;
    const { as_file: asFile, as_base64: asBase64, not_last_user_id: notLastUserId } = req.query;

    // Get signatures.
    let signaturesModelResponse;
    try {
      signaturesModelResponse = await this.p7sSignatureModel.findByFileId(fileId);
    } catch (error) {
      log.save('get-p7s-signatures-error', { error: error && error.message });
      return this.responseError(res, 'Get P7S signature error.');
    }
    const { data: p7sSignature } = signaturesModelResponse || {};
    const { meta } = p7sSignature || {};

    // Check user the same.
    if (notLastUserId && meta && meta.user && meta.user.userId && notLastUserId === meta.user.userId) {
      return this.responseData(res, { isLastUserTheSame: true }, {}, 409);
    }

    // Check signer the same.
    if (Array.isArray(meta?.signerList) && meta.signerList.some((signer) => signer?.userId === notLastUserId)) {
      return this.responseData(res, { isLastUserTheSame: true }, {}, 409);
    }

    // Check.
    if (!p7sSignature) {
      return this.responseError(res, 'Not found.', 404);
    }

    // Define P7S params.
    let fileModelResponse;
    try {
      fileModelResponse = await this.fileModel.findInfoById(fileId);
    } catch (error) {
      log.save('get-file-main-info-by-id-error', { error: error && error.message });
    }
    const { data: file } = fileModelResponse || {};
    const { name: fileName } = file;
    const p7sContentType = P7sSignatureEntity.ContentType;
    const p7sFileName = P7sSignatureEntity.getP7sFileName(fileName);

    p7sSignature.fileName = fileName;
    p7sSignature.p7sFileName = p7sFileName;
    p7sSignature.p7sContentType = p7sContentType;

    // Response as file if need it.
    if (asFile === 'true') {
      // Return as Base64 P7S if need it.
      if (asBase64 === 'true') {
        const p7sBase64 = p7sSignature.p7s;
        return this.responseFile(res, p7sBase64, p7sContentType, undefined, p7sFileName);
      }
      // Return P7S as file.
      const p7sBuffer = p7sSignature.getAsBuffer();
      return this.responseFile(res, p7sBuffer, p7sContentType, undefined, p7sFileName);
    }

    // Response entity in other cases.
    this.responseData(res, p7sSignature, meta);
  }

  /**
   * Create ASIC manifest.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async createAsicManifest(req, res) {
    // Define params.
    const { filesIds, dataObject = {} } = req.body;
    const { description, container_id: containerId = 1, meta: metaBase64 } = req.query;
    let meta;
    if (metaBase64) {
      try {
        meta = JSON.parse(Buffer.from(metaBase64, 'base64').toString('utf8'));
      } catch {
        return this.responseError(res, 'Can not parse meta as BASE64 of JSON string.', 400);
      }
    }
    const { user } = req.auth;

    // Define files container.
    const files = [];

    // Get files.
    for (const id of filesIds) {
      // Get file.
      let fileModelResponse;
      try {
        fileModelResponse = await this.fileModel.findWithoutDataById(id);
      } catch (error) {
        log.save('get-file-by-id-error', { error: error && error.message });
      }
      const { data: file } = fileModelResponse || {};

      // Check.
      if (!file) {
        return this.responseError(res, 'Not found.', 404);
      }

      // Add file to files container.
      files.push(file);
    }

    // Generate ASIC manifest.
    const asicManifestContent = new AsicManifest(files, true, dataObject).generateManifestContent();
    const asicManifestBuffer = Buffer.from(asicManifestContent, 'utf8');

    // Calc hash
    const fileHash = new FileHash(asicManifestBuffer);
    const hash = fileHash.calc();

    // Create file.
    let fileModelResponse;
    try {
      fileModelResponse = await this.fileModel.create({
        name: 'asicmanifest.xml',
        contentType: 'application/xml',
        contentLength: asicManifestBuffer.length,
        description,
        containerId,
        data: asicManifestBuffer,
        preview: null,
        hash,
        meta,
        user,
      });
    } catch (error) {
      log.save('save-generated-manifest-file-error', { error: error && error.message });
    }
    const { data: file } = fileModelResponse || {};

    // Check.
    if (!file) {
      return this.responseError(res, 'Can not save generated manifest.', 500);
    }

    // Response.
    this.responseData(res, file);
  }

  /**
   * Create ASiC-E.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async createAsice(req, res) {
    // Define params.
    const { manifestFileId, filesIds } = req.body;

    // Define ZIP.
    const zip = new AdmZip();

    // Add `mimetype` file.
    zip.addFile('mimetype', Buffer.from('application/vnd.etsi.asic-e+zip', 'utf8'));

    // Create `META-INF` directory in ZIP archive.
    zip.addFile('META-INF/', Buffer.from([]));

    // Get manifest file.
    let manifestFileModelResponse;
    try {
      manifestFileModelResponse = await this.fileModel.findById(manifestFileId);
    } catch (error) {
      log.save('get-file-by-id-error', { error: error && error.message });
    }
    const { data: manifestFile } = manifestFileModelResponse || {};

    // Check.
    if (!manifestFile) {
      return this.responseError(res, 'Manifest file not found.', 404);
    }

    // Add manifest file to ZIP archive.
    zip.addFile(`META-INF/${translit(manifestFile.name)}`, Buffer.from(manifestFile.data));

    // Add data from manifest as separate JSON file.
    let dataObjectBase64String;
    try {
      dataObjectBase64String = await AsicManifest.getDataObjectValue(manifestFile.data);
    } catch {
      log.save('get-data-object-from-asic-manifest-error', { manifestFileId, manifestFile: manifestFile.data });
    }
    const dataObjectJsonString = Buffer.from(dataObjectBase64String || '', 'base64').toString('utf8');
    zip.addFile('data.json', Buffer.from(dataObjectJsonString));

    // Get manifest file P7S signatures.
    let manifestSignaturesModelResponse;
    try {
      manifestSignaturesModelResponse = await this.p7sSignatureModel.findByFileId(manifestFileId);
    } catch (error) {
      log.save('get-manifest-file-p7s-signatures-error', { error: error && error.message });
    }
    const { data: manifestP7sSignature } = manifestSignaturesModelResponse || {};

    // Add manifest file signature to ZIP archive if exists.
    if (manifestP7sSignature) {
      zip.addFile('META-INF/signature.p7s', Buffer.from(manifestP7sSignature.p7s));
    }

    // Get files.
    for (const fileId of filesIds) {
      // Get file.
      let fileModelResponse;
      try {
        fileModelResponse = await this.fileModel.findById(fileId);
      } catch (error) {
        log.save('get-file-by-id-error', { error: error && error.message });
      }
      const { data: file } = fileModelResponse || {};

      // Check.
      if (!file) {
        return this.responseError(res, 'File not found.', 404);
      }

      // Add file to ZIP archive.
      zip.addFile(`${translit(file.name)}`, Buffer.from(file.data));

      // Get file P7S signatures.
      let signaturesModelResponse;
      try {
        signaturesModelResponse = await this.p7sSignatureModel.findByFileId(fileId);
      } catch (error) {
        log.save('get-file-p7s-signatures-error', { error: error && error.message });
      }
      const { data: p7sSignature } = signaturesModelResponse || {};

      // Add file signature to ZIP archive if exists.
      if (p7sSignature) {
        zip.addFile(`${translit(file.name)}.p7s`, Buffer.from(p7sSignature.p7s));
      }
    }

    // Save ZIP content.
    const zipContent = zip.toBuffer();

    // Response.
    this.responseFile(res, zipContent, 'application/zip', undefined, `${manifestFileId}.asice`);
  }

  /**
   * Create ASiC-S.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async createAsics(req, res) {
    // Define params.
    const { fileId } = req.body;

    // Get file.
    let fileModelResponse;
    try {
      fileModelResponse = await this.fileModel.findById(fileId);
    } catch (error) {
      log.save('get-file-by-id-error', { error: error && error.message });
    }
    const { data: fileInfo } = fileModelResponse || {};

    // Check file.
    if (!fileInfo) {
      return this.responseError(res, 'File not found.', 404);
    }

    // Prepare file data.
    const { name: fileName, data: fileBuffer } = fileInfo;

    // Get signature.
    let signaturesModelResponse;
    try {
      signaturesModelResponse = await this.signatureModel.getAll({ limit: 1, filter: { file_id: fileId } });
    } catch (error) {
      log.save('get-signatures-error', { error: error && error.message });
    }
    const { data: signatures } = signaturesModelResponse || {};
    const [signatureInfo] = signatures;

    // Check signature.
    if (!signatureInfo) {
      return this.responseError(res, 'Signature not found.', 404);
    }

    // Prepare signature data.
    const { signature: signatureBase64 } = signatureInfo;
    const signatureBuffer = Buffer.from(signatureBase64, 'base64');

    // Create ASiC-S container as ZIP.
    const asicsName = `${fileName}.zip`;
    const mimetypeBase64 = 'YXBwbGljYXRpb24vdm5kLmV0c2kuYXNpYy1zK3ppcA==';
    const mimetypeBuffer = Buffer.from(mimetypeBase64, 'base64');
    const zip = new JSZip();
    zip.file('mimetype', mimetypeBuffer);
    zip.file(fileName, fileBuffer);
    const metaDirectory = zip.folder('META-INF');
    metaDirectory.file('signature.p7s', signatureBuffer);
    const zipReadStream = zip.generateNodeStream({ type: 'nodebuffer' });

    // Response.
    this.responseFile(res, zipReadStream, 'application/zip', undefined, asicsName);
  }

  /**
   * Get files Id with p7s.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getFileIdsWithP7s(req, res) {
    // Define params.
    const { ids } = req.params;
    const fileIds = ids.split(',');

    let fileWithP7sMeta;
    try {
      fileWithP7sMeta = await this.p7sSignatureModel.getP7sMetadataByFileIds(fileIds);
    } catch (error) {
      log.save('get-p7s-by-file-ids-error', { error: error && error.message });
      return this.responseError(res, 'Get P7S by file ids error.');
    }
    const fileWithP7sMetaString = JSON.stringify(fileWithP7sMeta);
    const encryptedRes = Buffer.from(fileWithP7sMetaString).toString('base64');

    // Response.
    res.writeHead(200, {
      'P7s-Metadata': encryptedRes,
    });
    res.end();
  }
}

// Export.
module.exports = FilesController;
