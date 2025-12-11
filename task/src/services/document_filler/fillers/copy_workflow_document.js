const PropByPath = require('prop-by-path');
const Filler = require('./filler');
const StorageService = require('../../storage');

/**
 * Copy Workflow Document filler.
 */
class CopyWorkflowDocumentFiller extends Filler {
  constructor() {
    if (!CopyWorkflowDocumentFiller.singleton) {
      // Init parent constructor.
      super();

      this.storageService = new StorageService();
      CopyWorkflowDocumentFiller.singleton = this;
    }
    return CopyWorkflowDocumentFiller.singleton;
  }

  /**
   * Fill.
   * @param {object} schemaObject Schema object.
   * @param {object} objectToFill Object to fill.
   * @param {object} options Options.
   * @returns {object} Filled object.
   */
  async fill(schemaObject, objectToFill = {}, options = {}) {
    const { documentId, userInfo, userUnitsEntities, oauthToken } = options;

    // Handle all schema object pages.
    await this.handleAllElements(schemaObject, objectToFill, async (item, itemSchema) => {
      // Check that the current element shouldn't be defined.
      if (
        !itemSchema ||
        itemSchema.control !== 'copyWorkflowDocument' ||
        !userInfo ||
        !userUnitsEntities ||
        !oauthToken
      ) {
        return;
      }

      try {
        const { path, unitId: rawUnitId, steps = [] } = itemSchema || {};

        const { workflowId, taskTemplateId } = PropByPath.get(objectToFill, path) || {};
        if (!workflowId || !taskTemplateId) {
          log.save(
            'copy-workflow-document-filling-not-defined',
            { path, workflowId, taskTemplateId },
            'warn'
          );
          return;
        }

        const { document } =
          (await models.task.findDocumentByWorkflowIdAndTaskTemplateId(
            workflowId,
            taskTemplateId,
            true
          )) || {};

        if (!document) {
          log.save(
            'copy-workflow-document-filling-document-not-found',
            { workflowId, taskTemplateId },
            'warn'
          );
          return;
        }

        if (rawUnitId) {
          const unitId = this.getUnitId(rawUnitId, { objectToFill, userInfo });
          if (!unitId) {
            log.save(
              'copy-workflow-document-filling-unit-id-not-defined', 
              { unitId, workflowId, taskTemplateId }, 
              'warn'
            );
            return;
          }

          const isUserInUnit = userUnitsEntities.all.some((unit) => unit.id === unitId);
          if (!isUserInUnit) {
            log.save(
              'copy-workflow-document-filling-user-not-in-unit', 
              { unitId, workflowId, taskTemplateId }, 
              'warn'
            );
            return;
          }
        } else {
          // Check if the current user is the creator.
          if (document.createdBy !== userInfo.userId) {
            log.save(
              'copy-workflow-document-filling-not-allowed',
              { createdBy: document.createdBy, userId: userInfo.userId },
              'warn'
            );
            return;
          }
        }

        const { data } = document;

        // Get steps to fill.
        for (const step of steps) {
          // Get the step value.
          const stepValue = PropByPath.get(data, step);
          if (!stepValue) {
            continue;
          }

          // Set the step value.
          PropByPath.set(objectToFill, step, stepValue);
        }

        // Copy attachments.
        const attachments = await models.documentAttachment.getByDocumentId(document.id);
        const copyAttachments = [];
        for (const attachment of attachments) {
          const {
            link,
            name,
            type,
            labels = [],
            meta = {},
            isGenerated,
            isSystem
          } = attachment || {};

          const file = await this.storageService.provider.copyFile(link);

          if (file && file.id) {
            const documentAttachment = await models.documentAttachment.create({
              documentId,
              link: file.id,
              name,
              type,
              isGenerated,
              isSystem,
              labels,
              meta
            });

            copyAttachments.push(documentAttachment);
          }
        }

        // Update the document data with the new attachment information.
        const updatedObjectToFill = this.updateDocumentAttachments(objectToFill, {
          attachments,
          copyAttachments
        });

        for (const step of steps) {
          // Get the step value.
          const stepValue = PropByPath.get(updatedObjectToFill, step);
          if (!stepValue) {
            continue;
          }

          // Set the step value.
          PropByPath.set(objectToFill, step, stepValue);
        }
      } catch (error) {
        log.save(
          'copy-workflow-document-filling-error',
          { error: (error && error.message) || error, stack: error.stack },
          'warn'
        );
      }
    });

    return objectToFill;
  }

  /**
   * Update the document data with the new attachment information.
   * @param {object} documentData The document data to process.
   * @param {object[]} options.attachments The attachments to replace.
   * @param {object[]} options.copyAttachments The copied attachments.
   * @returns {object} The document data with replaced attachment information.
   */
  updateDocumentAttachments(documentData, { attachments, copyAttachments }) {
    // Convert document data to a string for processing.
    let documentJson = JSON.stringify(documentData);

    // Process each attachment replacement.
    attachments.forEach((attachment, index) => {
      const copyAttachment = copyAttachments[index];
      // Replace the id, link, and documentId in the document data string.
      ['id', 'link', 'documentId'].forEach((prop) => {
        if (attachment[prop] && copyAttachment[prop]) {
          const copyValue = copyAttachment[prop];
          documentJson = documentJson.replace(new RegExp(attachment[prop], 'g'), copyValue);
        }
      });
    });

    // Parse the processed string back into an object.
    return JSON.parse(documentJson);
  }

  /**
   * Get the unit id.
   * @param {string} rawUnitId The raw unit id.
   * @param {object} options Options.
   * @param {object} options.objectToFill Document data.
   * @param {object} options.userInfo User info.
   * @returns {string | null} The unit id.
   */
  getUnitId(rawUnitId, { objectToFill, userInfo }) {
    const isUnitIdFunction = typeof rawUnitId === 'string' && rawUnitId.startsWith('(') && rawUnitId.includes('=>');
    if (!isUnitIdFunction) {
      return rawUnitId;
    }

    try {
      const unitId = this.sandbox.evalWithArgs(
        rawUnitId,
        [objectToFill, userInfo],
        { meta: { fn: 'CopyWorkflowDocumentFiller.fill.unitId' } },
      );
      return unitId;
    } catch (error) {
      log.save('copy-workflow-document-filling-unit-id-eval-error', error, 'error');
      return null;
    }
  }
}

module.exports = CopyWorkflowDocumentFiller;
