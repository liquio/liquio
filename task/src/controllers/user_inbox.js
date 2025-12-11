
const { matchedData } = require('express-validator');
const Controller = require('./controller');
const UserInboxModel = require('../models/user_inbox');
const DownloadToken = require('../lib/download_token');
const StorageService = require('../services/storage');
const Eds = require('../lib/eds');

/**
 * User inbox controller.
 */
class UserInboxController extends Controller {
  /**
   * User inbox controller constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!UserInboxController.singleton) {
      super(config);
      this.userInboxModel = new UserInboxModel();
      this.downloadToken = new DownloadToken(config.download_token);
      this.storageService = new StorageService();
      this.eds = new Eds(config.eds);
      UserInboxController.singleton = this;
    }
    return UserInboxController.singleton;
  }

  /**
   * Get all.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getAll(req, res) {
    // Define params.
    const userId = this.getRequestUserId(req);

    const queryData = matchedData(req, { locations: ['query'] });
    const sort = queryData.sort || {};
    const filters = queryData.filters || {};

    const { page, count } = queryData;

    // Get user inboxes.
    let userInboxesEntities;
    try {
      userInboxesEntities = await this.userInboxModel.getByUserId(userId, {
        currentPage: page,
        perPage: count,
        sort: sort,
        filters: filters
      });
      userInboxesEntities.data = this.filterResponse(userInboxesEntities.data, true);
    } catch (error) {
      log.save('user-inbox-controller|get-all|get-from-db-error', { error: error?.toString(), stack: error.stack }, 'error');
      return this.responseError(res, error);
    }

    try {
      if (Array.isArray(userInboxesEntities.data)) {
        // Check if all meta info exists.
        const checkAllMetaInfoExists = (v) => !!(
          v.meta.fileType &&
          v.meta.generatedAttachments &&
          v.meta.generatedAttachments.every((a) => !!a.link) &&
          v.meta.fileId
        ); // Add more checks in future if new calculated fields used.

        // Create meta to save if need it.
        userInboxesEntities.data.forEach((v) => {
          if (!checkAllMetaInfoExists(v)) {
            v.metaToSave = {};
          }
        });

        let documents;
        try {
          const documentsPromises = userInboxesEntities.data.map((v) =>
            checkAllMetaInfoExists(v) ? null : models.document.findById(v.documentId)
          );
          documents = (await Promise.all(documentsPromises)).filter(Boolean);

          // Add field fileType to userInboxesEntities.data
          userInboxesEntities.data.forEach((v) => {
            v.fileType = checkAllMetaInfoExists(v) ?
              v.meta.fileType :
              documents.find((d) => d.id === v.documentId).fileType;
          });

        } catch (error) {
          log.save('get-file-type-error', { error: (error && error.message) || error }, 'warn');
        }

        const documentSignaturesPromises = userInboxesEntities.data.map((v) =>
          checkAllMetaInfoExists(v) ? null : models.documentSignature.getByDocumentId(v.documentId)
        );
        const documentSignatures = (await Promise.all(documentSignaturesPromises)).filter(Boolean);

        const documentAttachmentsPromises = userInboxesEntities.data.map((v) =>
          checkAllMetaInfoExists(v) ? null : models.documentAttachment.getByDocumentId(v.documentId)
        );
        const documentAttachments = (await Promise.all(documentAttachmentsPromises)).filter(Boolean);
        const generatedAttachments = documentAttachments.map((v) => v.filter((a) => a.isGenerated));

        const fileIds = documents.map((v) => v.fileId);
        for (let i = 0; i < generatedAttachments.length; i++) {
          const links = generatedAttachments[i].map((v) => v.link);
          fileIds.push(...links);
        }

        const p7sMeta = fileIds.length > 0 ?
          await this.storageService.provider.getP7sMetadata(fileIds) :
          [];

        // Add signature info.
        for (let i = 0; i < userInboxesEntities.data.length; i++) {
          if (checkAllMetaInfoExists(userInboxesEntities.data[i])) {
            userInboxesEntities.data[i].signature = userInboxesEntities.data[i].meta.signature;
          } else {
            let signatureInfo;
            try {
              const docSignature = documentSignatures.find(
                (el) => el[0] && el[0].documentId === userInboxesEntities.data[i].documentId
              );
              const signaturesInfoParse =
                docSignature && docSignature[0] && docSignature[0].signature
                  ? JSON.parse(docSignature[0].signature)
                  : [];
              const signature = signaturesInfoParse && signaturesInfoParse[0];
              signatureInfo = signature && await this.eds.getSignatureInfo(signature);
            } catch (error) {
              log.save(
                'user-inbox-get-signature-info-error',
                { error: (error && error.message) || error },
                'warn'
              );
            }
            userInboxesEntities.data[i].signature = signatureInfo;
          }

          userInboxesEntities.data[i].hasP7sSignature = userInboxesEntities.data[i].meta.hasP7sSignature ??
            p7sMeta.some((v) => v.file_id === documents[i].fileId);

          userInboxesEntities.data[i].downloadToken = this.downloadToken.generate(
            userInboxesEntities.data[i].meta.fileId ||
            documents.find((d) => d.id === userInboxesEntities.data[i].documentId).fileId
          );

          userInboxesEntities.data[i].generatedAttachments = userInboxesEntities.data[i].meta.generatedAttachments ||
            generatedAttachments.find((v) => v && v[0]?.documentId === userInboxesEntities.data[i].documentId) || [];

          for (let generatedAttachment of userInboxesEntities.data[i].generatedAttachments) {
            if (typeof generatedAttachment.hasP7sSignature === 'undefined') {
              generatedAttachment.hasP7sSignature = p7sMeta.some((v) => v.file_id === generatedAttachment.link);
            }
            generatedAttachment.downloadToken = this.downloadToken.generate(generatedAttachment.link);
          }

          // Update meta if need it.
          if (userInboxesEntities.data[i].metaToSave) {
            userInboxesEntities.data[i].metaToSave.hasP7sSignature = userInboxesEntities.data[i].hasP7sSignature;
            userInboxesEntities.data[i].metaToSave.signature = userInboxesEntities.data[i].signature;
            userInboxesEntities.data[i].metaToSave.fileType = userInboxesEntities.data[i].fileType;
            userInboxesEntities.data[i].metaToSave.fileId = documents.find((d) => d.id === userInboxesEntities.data[i].documentId).fileId;
            userInboxesEntities.data[i].metaToSave.generatedAttachments = (userInboxesEntities.data[i].generatedAttachments || []).map(a => ({
              ...a,
              downloadToken: undefined
            }));

            this.userInboxModel.setMeta(userInboxesEntities.data[i].id, userInboxesEntities.data[i].metaToSave, { silent: true });
          }
        }
      }
    } catch (error) {
      log.save('user-inbox-controller|get-all|prepare-error', { error: error?.toString(), stack: error.stack }, 'error');
      return this.responseError(res, error);
    }

    this.responseData(res, userInboxesEntities, true);
  }

  /**
   * Get unread count.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getUnreadCount(req, res) {
    // Define params.
    const userId = this.getRequestUserId(req);

    // Get user inboxes unread count.
    let inboxesUnreadCount;
    try { inboxesUnreadCount = await this.userInboxModel.getUnreadCountByUserId(userId); } catch (error) { return this.responseError(res, error); }

    this.responseData(res, inboxesUnreadCount);
  }

  /**
   * Set is read.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async setIsRead(req, res) {
    // Define params.
    const { id } = req.params;
    const userId = this.getRequestUserId(req);

    // Get by ID.
    let userInbox;
    try { userInbox = await this.userInboxModel.findById(id); } catch (error) { return this.responseError(res, error); }

    // Check if not exist.
    if (!userInbox) { return this.responseError(res, 'User inbox not found.', 404); }

    // Check access.
    if (userInbox.userId !== userId) { return this.responseError(res, 'User do not have access to this inbox.', 403); }

    // Set is read.
    try { await this.userInboxModel.setIsRead(id); } catch (error) { return this.responseError(res, error); }

    this.responseData(res, true);
  }
}

module.exports = UserInboxController;
