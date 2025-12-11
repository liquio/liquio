
const Option = require('./option');

// Constants.
const ATTACHMENT_LIST_TEXT_PREFIX = 'Додатки:<br />';
const ATTACHMENT_LIST_TEXT_SEPARATOR = '<br />';

/**
 * Attachment option.
 */
class AttachmentOption extends Option {
  /**
   * Get attachment options.
   * @param {object} options Options.
   * @param {object} options.documentData Document data.
   */
  get({ documentData }) {
    // Check input params.
    if (typeof documentData !== 'object') {
      return {};
    }

    // Define attachment HTML.
    const attachment = documentData.attachment || documentData.attachments || [];
    if (!attachment.length === 0) {
      return {};
    }
    const attachmentNames = attachment.map(attachment => attachment.name);
    const attachmentNamesWithNumbers = Object.entries(attachmentNames).map(entry => `${parseInt(entry[0]) + 1}. ${entry[1]}.`);
    const attachmentListHtml = attachmentNamesWithNumbers.join(ATTACHMENT_LIST_TEXT_SEPARATOR);
    const attachmentHtml = attachmentNamesWithNumbers.length > 0 ? `${ATTACHMENT_LIST_TEXT_PREFIX}${attachmentListHtml}` : '';

    // Return attachment options.
    const attachmentOptions = { 'attachment.list': attachmentHtml, 'attaches.list': attachmentHtml };
    return attachmentOptions;
  }
}

module.exports = AttachmentOption;
