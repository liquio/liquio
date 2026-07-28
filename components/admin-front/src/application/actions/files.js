import * as api from 'services/api';
import * as Sentry from '@sentry/browser';

import { addError } from 'actions/error';

import blobToBase64 from 'helpers/blobToBase64';

const UPLOAD_FILE = 'FILES/UPLOAD_FILE';

const DOWNLOAD_ASICS = 'DOWNLOAD_ASICS';
const DOWNLOAD_FILE = 'DOWNLOAD_FILE';
const DOWNLOAD_FILE_PREVIEW = 'DOWNLOAD_FILE_PREVIEW';
const DOWNLOAD_FILE_DECODED = 'DOWNLOAD_FILE_DECODED';
const DOWNLOAD_FILE_PREVIEW_DECODED = 'DOWNLOAD_FILE_PREVIEW_DECODED';
const CLEAR_DOCUMENT_ATTACH_DECODED = 'CLEAR_DOCUMENT_ATTACH_DECODED';

export const uploadFile = (file) => (dispatch) =>
  api
    .upload('files', file, { file_name: file.name }, UPLOAD_FILE, dispatch)
    .catch((error) => {
      dispatch(addError(new Error('FailLoadingFile')));
      Sentry.captureException(error);
    });

export const downloadFile =
  ({ downloadToken }, asics = false, p7sSign = false) =>
  (dispatch) => {
    let params = '';

    if (asics) {
      params = '?asics=true';
    }

    if (p7sSign) {
      params = '?p7s=true';
    }

    return api
      .get(`files/${downloadToken}${params}`, DOWNLOAD_FILE, dispatch)
      .then(async (blob) => {
        const decoded = await blobToBase64(blob);
        dispatch({
          id: downloadToken,
          type: DOWNLOAD_FILE_DECODED,
          payload: decoded,
        });
        return decoded;
      })
      .catch((error) => {
        dispatch(addError(new Error('FailLoadingFile')));
        Sentry.captureException(error);
      });
  };

export const downloadFilePreview =
  ({ downloadToken }) =>
  (dispatch) =>
    api
      .get(
        `files/${downloadToken}?preview=true`,
        DOWNLOAD_FILE_PREVIEW,
        dispatch,
      )
      .then(async (blob) => {
        const decoded = await blobToBase64(blob);
        dispatch({
          id: downloadToken,
          type: DOWNLOAD_FILE_PREVIEW_DECODED,
          payload: decoded,
        });
        return decoded;
      })
      .catch(Sentry.captureException);

export const downloadASICS = (downloadToken) => (dispatch) =>
  api.get(`files/${downloadToken}?asics=true`, DOWNLOAD_ASICS, dispatch);

export const getFile =
  ({ downloadToken }) =>
  (dispatch) =>
    api
      .get(`files/${downloadToken}?asics=false`, DOWNLOAD_FILE, dispatch)
      .then((blob) => blobToBase64(blob))
      .catch((error) => {
        dispatch(addError(new Error('FailLoadingFile')));
        Sentry.captureException(error);
      });

export const clearDocumentAttaches = () => (dispatch) =>
  dispatch({
    type: CLEAR_DOCUMENT_ATTACH_DECODED,
  });
