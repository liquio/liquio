import * as api from 'services/api';

type Dispatch = (action: unknown) => unknown;

export const createSignSession =
  (documentId: string | number, body: unknown = {}) =>
  (dispatch: Dispatch) =>
    api
      .post(`external-file-signer/${documentId}`, body, 'CREATE_SIGN_SESSION', dispatch)
      .catch((error) => {
        return new Error(error);
      });

export const updateSignSession =
  (documentId: string | number, body: unknown = {}) =>
  (dispatch: Dispatch) =>
    api
      .put(`external-file-signer/${documentId}`, body, 'UPDATE_SIGN_SESSION', dispatch)
      .catch((error) => {
        return new Error(error);
      });
