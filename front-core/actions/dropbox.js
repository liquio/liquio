import * as api from 'services/api';

export const createSignSession =
  (documentId, body = {}) =>
  (dispatch) =>
    api
      .post(`external-file-signer/${documentId}`, body, 'CREATE_SIGN_SESSION', dispatch)
      .catch((error) => {
        return new Error(error);
      });

export const updateSignSession =
  (documentId, body = {}) =>
  (dispatch) =>
    api
      .put(`external-file-signer/${documentId}`, body, 'UPDATE_SIGN_SESSION', dispatch)
      .catch((error) => {
        return new Error(error);
      });
