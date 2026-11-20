import storage from 'helpers/storage';
import { addMessage, closeError } from 'actions/error';
import Message from 'components/Snackbars/Message';

type Dispatch = (action: unknown) => unknown;

let timeout: ReturnType<typeof setTimeout> | null = null;

const getHeaders = () => {
  const readerMocks = storage.getItem('enabled_mocks');

  clearTimeout(timeout as ReturnType<typeof setTimeout>);

  const headers: Record<string, string> = {};

  if (readerMocks) {
    headers['enabled-mocks'] = readerMocks.split(',').join('|');
  }

  return headers;
};

export const getHeadersResponse = (dispatch: Dispatch, headers?: string | null) => {
  clearTimeout(timeout as ReturnType<typeof setTimeout>);

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
