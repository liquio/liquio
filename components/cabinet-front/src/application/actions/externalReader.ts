import * as api from 'services/api';
import getHeaders, { getHeadersResponse } from 'helpers/getReaderMocks';

type Dispatch = (action: unknown) => unknown;

const REQUEST_EXTERNAL_DATA = 'REQUEST_EXTERNAL_DATA';

export const requestExternalData =
  (requestData: unknown = {}) =>
  (dispatch: Dispatch) =>
    api
      .post(
        'external_reader',
        requestData,
        REQUEST_EXTERNAL_DATA,
        dispatch,
        { requestData },
        // getHeaders ignores its argument (it never reads a `dispatch` param); the call
        // here matches its real 0-arg signature rather than the original's unused pass-through.
        { headers: getHeaders() as unknown as Record<string, string> }
      )
      .then((responseValue) => {
        const response = responseValue as Response | undefined;
        const returnedMocks = response?.headers?.get('Returned-Mocks');
        getHeadersResponse(dispatch, returnedMocks);
        return response;
      })
      .catch((error) => error);

export default { requestExternalData };
