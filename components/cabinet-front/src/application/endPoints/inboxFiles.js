import { markInboxRead } from 'application/actions/inbox';
import { getPDFDocumentDecoded } from 'application/actions/task';

export default {
  dataURL: 'user-inboxes',
  sourceName: 'inboxFilesList',
  actions: { markInboxRead, handleDownloadFile: getPDFDocumentDecoded }
};
