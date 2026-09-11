import * as api from 'services/api';
import getHeaders, { getHeadersResponse } from 'helpers/getReaderMocks';

const REQUEST_EXTERNAL_DATA = 'REQUEST_EXTERNAL_DATA';

export const requestExternalData =
  (requestData = {}) =>
  (dispatch) =>
    api
      .post(
        'external_reader',
        requestData,
        REQUEST_EXTERNAL_DATA,
        dispatch,
        { requestData },
        { headers: getHeaders(dispatch) }
      )
      .then((response) => {
        const returnedMocks = response?.headers?.get('Returned-Mocks');
        getHeadersResponse(dispatch, returnedMocks);
        return response;
      })
      .catch((error) => error);

export default { requestExternalData };
