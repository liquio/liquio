import qs from 'qs';

import { toUnderscoreObject } from 'helpers/toUnderscore';
import { markMessageRead } from 'application/actions/messages';

const MARK_MESSAGE_READ_SUCCESS = 'MARK_MESSAGE_READ_SUCCESS';

const SET_DECRYPTED_DATA_SUCCESS = 'MESSAGES/SET_DECRYPTED_DATA_SUCCESS';

const endPoint = {
  dataURL: 'messages',
  sourceName: 'messagesList',
  actions: {
    markMessageRead,
    isRowSelectable:
      ({ isRead }) =>
      () =>
        !isRead
  },
  startPage: 0,
  reduce: (state, action) => {
    switch (action.type) {
      case MARK_MESSAGE_READ_SUCCESS: {
        const messageId = parseInt(action.request.messageId, 10);
        return {
          ...state,
          data: state.data.map((message) =>
            messageId === message.id ? { ...message, isRead: 1 } : message
          )
        };
      }
      case SET_DECRYPTED_DATA_SUCCESS: {
        const { messageId, ...changedMessage } = action.payload;

        return {
          ...state,
          data: state.data.map((message) =>
            message.id === messageId ? { ...changedMessage, id: messageId } : message
          )
        };
      }
      default:
        return state;
    }
  }
};

endPoint.mapData = (payload, { page }) => {
  const { meta } = payload;
  const {
    pagination: { total }
  } = meta || { pagination: { total: 0 } };

  return {
    data: Array.isArray(payload)
      ? payload.map(({ messageId, ...message }) => ({
          ...message,
          id: messageId
        }))
      : [],
    page: page || 1,
    count: total || 0
  };
};

endPoint.getDataUrl = (
  url,
  { page, rowsPerPage, filters: { name: search, from_created_at, to_created_at, ...filters }, sort }
) => {
  const urlData = {
    filters: toUnderscoreObject(filters),
    sort: toUnderscoreObject(sort)
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

  urlData.start = (urlData.page || 0) * (rowsPerPage || 10);

  const queryString = qs.stringify(urlData, { arrayFormat: 'index' });

  return url + (queryString && '?' + queryString);
};

export default endPoint;
