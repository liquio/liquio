import * as api from 'services/api';

type Dispatch = (action: unknown) => unknown;

export const getList = () => (dispatch: Dispatch) =>
  api
    .get('ext-reader/mocks', 'GET_MOCK_LIST', dispatch)
    .catch((error) => error);

export const updateMockInfo = (body: unknown) => (dispatch: Dispatch) =>
  api
    .post('ext-reader/mocks', body, 'UPDATE_USER_INFO', dispatch)
    .catch((error) => error);

export const updateUserInfo = (body: unknown) => (dispatch: Dispatch) =>
  api
    .post('ext-reader/user-info', body, 'UPDATE_USER_INFO', dispatch)
    .catch((error) => error);

export const turnOnMock =
  ({ provider, method }: { provider: string; method: string }) =>
  (dispatch: Dispatch) =>
    api
      .put(
        `ext-reader/mocks/${provider}/${method}/enable`,
        {},
        'TURN_ON_MOCK',
        dispatch,
      )
      .catch((error) => error);

export const turnOffMock =
  ({ provider, method }: { provider: string; method: string }) =>
  (dispatch: Dispatch) =>
    api
      .put(
        `ext-reader/mocks/${provider}/${method}/disable`,
        {},
        'TURN_OFF_MOCK',
        dispatch,
      )
      .catch((error) => error);

export const turnOnUserInfo =
  ({ provider, method }: { provider: string; method: string }) =>
  (dispatch: Dispatch) =>
    api
      .put(
        `ext-reader/user-info/${provider}/${method}/enable`,
        {},
        'TURN_ON_USER_INFO',
        dispatch,
      )
      .catch((error) => error);

export const turnOffUserInfo =
  ({ provider, method }: { provider: string; method: string }) =>
  (dispatch: Dispatch) =>
    api
      .put(
        `ext-reader/user-info/${provider}/${method}/disable`,
        {},
        'TURN_OFF_USER_INFO',
        dispatch,
      )
      .catch((error) => error);

export const createProvider = (body: unknown) => (dispatch: Dispatch) =>
  api
    .post('ext-reader/mocks/provider', body, 'CREATE_PROVIDER', dispatch)
    .catch((error) => error);

export const createProviderMethod = (provider: string, body: unknown) => (dispatch: Dispatch) =>
  api
    .post(
      `ext-reader/mocks/provider/${provider}/method`,
      body,
      'CREATE_PROVIDER_METHOD',
      dispatch,
    )
    .catch((error) => error);

export const deleteProvider = (provider: string) => (dispatch: Dispatch) =>
  api
    .del(
      `ext-reader/mocks/provider/${provider}`,
      {},
      'DELETE_PROVIDER',
      dispatch,
    )
    .catch((error) => error);

export const deleteProviderMethod = (method: string) => (dispatch: Dispatch) =>
  api
    .del(
      `ext-reader/mocks/method/${method}`,
      {},
      'DELETE_PROVIDER_METHOD',
      dispatch,
    )
    .catch((error) => error);

export const deleteMock = (service: string, method: string) => (dispatch: Dispatch) =>
  api
    .del(
      `ext-reader/mocks/${service}/${method}`,
      {},
      'DELETE_MOCK_METHOD',
      dispatch,
    )
    .catch((error) => error);

export const getAllMocksIds = () => (dispatch: Dispatch) =>
  api.get('ext-reader/v2/mocks', 'GET_ALL_MOCKS', dispatch);

export const getOneMock = (id: string | number) => (dispatch: Dispatch) =>
  api.get(`ext-reader/v2/mocks/${id}`, 'GET_ONE_MOCK', dispatch);

export const createOneMock = (body: unknown) => (dispatch: Dispatch) =>
  api
    .put('ext-reader/v2/mocks', body, 'CREATE_ONE_MOCK', dispatch)
    .catch((error) => error);

export const updateOneMock = (id: string | number, body: unknown) => (dispatch: Dispatch) =>
  api
    .post(`ext-reader/v2/mocks/${id}`, body, 'UPDATE_ONE_MOCK', dispatch)
    .catch((error) => error);

export const deleteOneMock = (id: string | number) => (dispatch: Dispatch) =>
  api
    .del(`ext-reader/v2/mocks/${id}`, {}, 'DELETE_ONE_MOCK', dispatch)
    .catch((error) => error);
