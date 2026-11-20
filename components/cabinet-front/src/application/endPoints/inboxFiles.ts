import { markInboxRead } from 'application/actions/inbox';
import { getPDFDocumentDecoded } from 'application/actions/task';
import type { DataTableEndpoint } from 'core/services/dataTable/types';

export default {
  dataURL: 'user-inboxes',
  sourceName: 'inboxFilesList',
  actions: { markInboxRead, handleDownloadFile: getPDFDocumentDecoded }
} satisfies DataTableEndpoint;
