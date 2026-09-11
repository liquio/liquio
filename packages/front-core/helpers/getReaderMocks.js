import storage from 'helpers/storage';
import { addMessage, closeError } from 'actions/error';
import Message from 'components/Snackbars/Message';

let timeout = null;

const getHeaders = () => {
  const readerMocks = storage.getItem('enabled_mocks');

  clearTimeout(timeout);

  const headers = {};

  if (readerMocks) {
    headers['enabled-mocks'] = readerMocks.split(',').join('|');
  }

  return headers;
};

export const getHeadersResponse = (dispatch, headers) => {
  clearTimeout(timeout);

  if (headers) {
    timeout = setTimeout(() => {
      dispatch(closeError());
      dispatch(
        addMessage(new Message('MocksAreUsing', 'warning', headers.split(','))),
      );
    }, 500);
  }
};

export default getHeaders;
