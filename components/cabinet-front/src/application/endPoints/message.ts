import qs from 'qs';

import { toUnderscoreObject } from 'helpers/toUnderscore';
import { markMessageRead } from 'application/actions/messages';
import type { DataTableEndpoint } from 'core/services/dataTable/types';

const MARK_MESSAGE_READ_SUCCESS = 'MARK_MESSAGE_READ_SUCCESS';

const SET_DECRYPTED_DATA_SUCCESS = 'MESSAGES/SET_DECRYPTED_DATA_SUCCESS';

interface MessageRow {
  id: unknown;
  isRead?: number;
  [key: string]: unknown;
}

const endPoint: DataTableEndpoint = {
  dataURL: 'messages',
  sourceName: 'messagesList',
  actions: {
    markMessageRead,
    isRowSelectable:
      ({ isRead }: { isRead?: boolean }) =>
      () =>
        !isRead
  },
  startPage: 0,
  reduce: (state, action) => {
    switch (action.type) {
      case MARK_MESSAGE_READ_SUCCESS: {
        const messageId = parseInt((action.request as { messageId: string }).messageId, 10);
        return {
          ...state,
          data: (state.data as MessageRow[]).map((message) => (messageId === message.id ? { ...message, isRead: 1 } : message))
        };
      }
      case SET_DECRYPTED_DATA_SUCCESS: {
        const { messageId, ...changedMessage } = action.payload as { messageId: unknown; [key: string]: unknown };

        return {
          ...state,
          data: (state.data as MessageRow[]).map((message) => (message.id === messageId ? { ...changedMessage, id: messageId } : message))
        };
      }
      default:
        return state;
    }
  }
};

endPoint.mapData = (payload, { page }) => {
  const { meta } = payload as { meta?: { pagination?: { total?: number } } };
  const {
    pagination: { total } = { total: 0 }
  } = meta || { pagination: { total: 0 } };

  return {
    data: Array.isArray(payload)
      ? (payload as Array<Record<string, unknown>>).map(({ messageId, ...message }) => ({
          ...message,
          id: messageId
        }))
      : [],
    page: page || 1,
    count: total || 0
  };
};

endPoint.getDataUrl = (url, { page, rowsPerPage, filters, sort }) => {
  const { name: search, from_created_at, to_created_at, ...rest } = filters;
  const urlData: Record<string, unknown> = {
    filters: toUnderscoreObject(rest),
    sort: toUnderscoreObject(sort || {})
  };

  if (typeof page === 'number') {
    urlData.page = (page || 1) - 1;
  }

  if (from_created_at) {
    urlData.from_created_at = from_created_at;
  }

  if (to_created_at) {
    urlData.to_created_at = to_created_at;
  }

  if (rowsPerPage) {
    urlData.count = rowsPerPage;
  }

  if (search) {
    urlData.search = search;
  }

  urlData.start = ((urlData.page as number) || 0) * ((rowsPerPage as number) || 10);

  const queryString = qs.stringify(urlData, { arrayFormat: 'index' });

  return url + (queryString && '?' + queryString);
};

export default endPoint;
