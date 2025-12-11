/* eslint-disable camelcase */
import * as api from 'services/api';
import * as Sentry from '@sentry/browser';

import { addError } from 'actions/error';

import blobToBase64 from 'helpers/blobToBase64';
import isJson from 'helpers/isJson';
import store from 'store';

const LOAD_TASK = 'LOAD_TASK';
const CREATE_TASK = 'CREATE_TASK';
const COMMIT_TASK = 'COMMIT_TASK';
const LOAD_TASK_DOCUMENT = 'LOAD_TASK_DOCUMENT';
const STORE_TASK_DOCUMENT = 'STORE_TASK_DOCUMENT';

const GET_TASK_DOCUMENT_SIGN_DATA = 'GET_TASK_DOCUMENT_SIGN_DATA';
const SIGN_DOCUMENT = 'SIGN_DOCUMENT';
const GET_DOCUMENT_ADDITIONAL = 'GET_DOCUMENT_ADDITIONAL';
const SIGN_DOCUMENT_ADDITIONAL = 'SIGN_DOCUMENT_ADDITIONAL';
const REJECT_DOOCUMENT_SIGNING = 'REJECT_DOOCUMENT_SIGNING';

const SET_TASK_DOCUMENTS_VALUES = 'SET_TASK_DOCUMENTS_VALUES';
const UPDATE_TASK_DOCUMENT_VALUES = 'UPDATE_TASK_DOCUMENT_VALUES';
const TOGGLE_CREATE_TASK_DIALOG = 'TOGGLE_CREATE_TASK_DIALOG';

const GET_PDF_DOCUMENT = 'GET_PDF_DOCUMENT';
const GET_PDF_DOCUMENT_DECODED = 'GET_PDF_DOCUMENT_DECODED';
const GENERATE_PDF_DOCUMENT = 'GENERATE_PDF_DOCUMENT';
const UPLOAD_DOCUMENT_ATTACH = 'UPLOAD_DOCUMENT_ATTACH';
const GET_DOCUMENT_WORKFLOW_FILES = 'GET_DOCUMENT_WORKFLOW_FILES';
const DELETE_DOCUMENT_ATTACH = 'DELETE_DOCUMENT_ATTACH';
const DOWNLOAD_DOCUMENT_ATTACH = 'DOWNLOAD_DOCUMENT_ATTACH';
const DOWNLOAD_DOCUMENT_ATTACH_DECODED = 'DOWNLOAD_DOCUMENT_ATTACH_DECODED';
const DOWNLOAD_DOCUMENT_ATTACH_PREVIEW = 'DOWNLOAD_DOCUMENT_ATTACH_PREVIEW';
const DOWNLOAD_DOCUMENT_ATTACH_PREVIEW_DECODED =
  'DOWNLOAD_DOCUMENT_ATTACH_PREVIEW_DECODED';

const SET_TASK_SIGNERS = 'SET_TASK_SIGNERS';
const SET_TASK_SCREEN = 'SET_TASK_SCREEN';
const CLEAR_TASK_STEP_AND_SCREEN = 'CLEAR_TASK_STEP_AND_SCREEN';
const SET_TASK_STEP = 'SET_TASK_STEP';

const SET_TASK_DUE_DATE = 'SET_TASK_DUE_DATE';
const REQUEST_NEXT_TASK = 'REQUEST_NEXT_TASK';

const DOWNLOAD_ASIC_CONTAINER = 'DOWNLOAD_ASIC_CONTAINER';

const GET_MY_UNREAD_TASK_COUNT = 'GET_MY_UNREAD_TASK_COUNT';
const GET_UNIT_UNREAD_TASK_COUNT = 'GET_UNIT_UNREAD_TASK_COUNT';
const MARK_TASK_READ = 'MARK_TASK_READ';

const CALCULATE_FIELDS = 'CALCULATE_FIELDS';
const GET_PAYMENT_INFO = 'GET_PAYMENT_INFO';
const GET_PAYMENT_STATUS = 'GET_PAYMENT_STATUS';
const GET_PAYMENT_RECEIPT = 'GET_PAYMENT_RECEIPT';
const CONFIRM_SMS_CODE = 'CONFIRM_SMS_CODE';

const PUT_TASK_SIGNERS = 'PUT_TASK_SIGNERS';
const CHECK_TASK_SIGNERS = 'CHECK_TASK_SIGNERS';
const GET_UNCREATED_TASK_ID = 'GET_UNCREATED_TASK_ID';
const DELETE_SIGNATURES = 'DELETE_SIGNATURES';
const CHECK_DATA_EXTERNAL_READER = 'CHECK_DATA_EXTERNAL_READER';
const VALIDATE_DOCUMENT = 'VALIDATE_DOCUMENT';
const UPDATE_TASK_ASSIGN = 'UPDATE_TASK_ASSIGN';
const HANDLE_SILENT_TRIGGERS = 'HANDLE_SILENT_TRIGGERS';

const GET_DATA_TO_ENCRYPT = 'GET_DATA_TO_ENCRYPT';
const SAVE_ENCRYPTED_DATA = 'SAVE_ENCRYPTED_DATA';

const SET_ERROR_TASK_SIGNERS = 'SET_ERROR_TASK_SIGNERS';

export const updateTaskAssign = (taskId, newPerformerUsers) => (dispatch) =>
  api
    .post(
      `tasks/${taskId}/assign`,
      { newPerformerUsers },
      UPDATE_TASK_ASSIGN,
      dispatch,
    )
    .catch((error) => {
      Sentry.captureException(error);
      return error;
    });

export const confirmSmsCode = (body) => (dispatch) =>
  api
    .post(
      'payment/ebabyEasyPaySms/confirm_code',
      body,
      CONFIRM_SMS_CODE,
      dispatch,
    )
    .catch((error) => {
      dispatch(addError(new Error('FailConfirmingSmsCode')));
      Sentry.captureException(error);
    });

export const getPaymentInfo = (id, body) => (dispatch) =>
  api
    .post(`documents/${id}/calc_payment`, body, GET_PAYMENT_INFO, dispatch)
    .catch((error) => {
      const { message } = error;

      if (!isJson(message)) {
        const typicalErrors = [
          "Error: Can't find recipient banking details.",
          "Error: Can't define pay type for this phone number.",
          "Error: User phone is not defined. Can't get payment data.",
        ];
        const exists = typicalErrors.filter((mss) => message === mss);
        dispatch(
          addError(
            new Error(exists.length ? message : 'FailGettingPaymentInfo'),
          ),
        );
      } else if (isJson(message)) {
        const messageJson = JSON.parse(message);
        const { fieldErrors, error_message } = messageJson;
        const string = (fieldErrors || [])
          .map(({ errorMessage }) => errorMessage)
          .join('\n');
        const undefinedMessage =
          messageJson.errorMessage || JSON.stringify(messageJson);
        const fullMessage = string
          ? `Помилка провайдера оплати: ${messageJson.errorMessage} - ${string} `
          : `Помилка провайдера оплати: ${undefinedMessage}`;
        dispatch(addError(new Error(fullMessage || error_message)));
      }
      Sentry.captureException(error);
    });

export const getPaymentStatus = (id) => (dispatch) =>
  api.get(`documents/${id}`, GET_PAYMENT_STATUS, dispatch).catch((error) => {
    dispatch(addError(new Error('FailGettingPaymentStatus')));
    Sentry.captureException(error);
  });

export const getPaymentReceipt =
  ({ payment_path, document_id, order_id }) =>
  (dispatch) =>
    api
      .get(
        `payment/receipt?payment_path=${payment_path}&document_id=${document_id}&order_id=${order_id}`,
        GET_PAYMENT_RECEIPT,
        dispatch,
      )
      .catch((error) => {
        dispatch(addError(new Error('FailGettingPaymentStatus')));
        Sentry.captureException(error);
      });

export const calculateFields =
  (taskId, { id, body }) =>
  (dispatch) =>
    api
      .post(`documents/${id}/calc`, body, CALCULATE_FIELDS, dispatch, {
        taskId,
      })
      .catch((error) => {
        dispatch(addError(new Error('FailCalculating')));
        Sentry.captureException(error);
      });

export const setTaskScreen = (taskId, screen) => ({
  type: SET_TASK_SCREEN,
  payload: { taskId, screen },
});

export const clearStepAndScreen = (taskId) => ({
  type: CLEAR_TASK_STEP_AND_SCREEN,
  payload: { taskId },
});

export const setTaskStep = (taskId, step) => ({
  type: SET_TASK_STEP,
  payload: { taskId, step },
});

export const getUncreatedTaskId = (workflowId, taskTemplateId) => (dispatch) =>
  api
    .get(
      `tasks/last/${workflowId}/${taskTemplateId}`,
      GET_UNCREATED_TASK_ID,
      dispatch,
    )
    .catch((error) => {
      // dispatch(addError(new Error('FailFetchingTask')));
      Sentry.captureException(error);
      return error;
    });

export const loadTask = (taskId) => (dispatch) =>
  api.get(`tasks/${taskId}`, LOAD_TASK, dispatch).catch((error) => {
    // dispatch(addError(new Error('FailFetchingTask')));
    Sentry.captureException(error);
    return error;
  });

export const createTask = (data) => (dispatch) =>
  api.post('tasks', data, CREATE_TASK, dispatch).catch((error) => {
    // dispatch(addError(new Error('FailCreatingTask')));
    Sentry.captureException(error);
    return error;
  });

export const loadTaskDocument = (documentId) => (dispatch) =>
  api
    .get(`documents/${documentId}`, LOAD_TASK_DOCUMENT, dispatch, {
      documentId,
    })
    .catch((error) => {
      dispatch(addError(new Error('FailLoadingDocument')));
      Sentry.captureException(error);
      return error;
    });

export const storeTaskDocument =
  ({ task, data, params }) =>
  (dispatch) =>
    api
      .put(
        `documents/${task.documentId}${params}`,
        data,
        STORE_TASK_DOCUMENT,
        dispatch,
        { task },
      )
      .catch((error) => {
        dispatch(addError(new Error('FailUpdatingDocument')));
        Sentry.captureException(error);
        return error;
      });

export const getTaskDocumentSignData = (documentId) => (dispatch) =>
  api
    .get(`documents/${documentId}/sign`, GET_TASK_DOCUMENT_SIGN_DATA, dispatch)
    .catch((error) => {
      dispatch(addError(new Error('FailGettingSignData')));
      Sentry.captureException(error);
      return error;
    });

export const getTaskDocumentP7SSignData =
  (documentId, attachmentId) => (dispatch) => {
    let url = `documents/${documentId}/sign_p7s`;

    if (attachmentId) {
      url += `?attachment_id=${attachmentId}`;
    }

    return api
      .get(url, GET_TASK_DOCUMENT_SIGN_DATA, dispatch)
      .catch((error) => {
        dispatch(addError(new Error('FailGettingSignData')));
        Sentry.captureException(error);
        return error;
      });
  };

export const signTaskDocument = (documentId, signature) => (dispatch) =>
  api
    .post(
      `documents/${documentId}/sign`,
      { signature },
      SIGN_DOCUMENT,
      dispatch,
    )
    .catch((error) => {
      Sentry.captureException(error);
      return error;
    });

export const getTaskDocumentAdditional = (documentId) => (dispatch) =>
  api
    .get(
      `documents/${documentId}/sign_additional_p7s`,
      GET_DOCUMENT_ADDITIONAL,
      dispatch,
    )
    .catch((error) => {
      Sentry.captureException(error);
      return error;
    });

export const signTaskDocumentAdditional = (documentId, params) => (dispatch) =>
  api.post(
    `documents/${documentId}/sign_additional_p7s`,
    params,
    SIGN_DOCUMENT_ADDITIONAL,
    dispatch,
  );

export const getDataToEncrypt = (documentId) => (dispatch) =>
  api
    .get(`documents/${documentId}/encrypt`, GET_DATA_TO_ENCRYPT, dispatch)
    .catch((error) => {
      Sentry.captureException(error);
      return error;
    });

export const saveEncryptedData = (documentId, encrypted) => (dispatch) =>
  api
    .post(
      `documents/${documentId}/encrypt`,
      { encrypted },
      SAVE_ENCRYPTED_DATA,
      dispatch,
    )
    .catch((error) => {
      Sentry.captureException(error);
      return error;
    });

export const signTaskDocumentP7S =
  (documentId, p7sSignature, attachmentId) => (dispatch) => {
    let url = `documents/${documentId}/sign_p7s`;

    if (attachmentId) {
      url += `?attachment_id=${attachmentId}`;
    }

    return api
      .post(url, { p7sSignature }, SIGN_DOCUMENT, dispatch)
      .catch((error) => {
        // dispatch(addError(new Error('FailSignDocumentData')));
        Sentry.captureException(error);
        return error;
      });
  };

export const rejectDocumentSigning = (documentId, rejectData) => (dispatch) =>
  api
    .post(
      `documents/${documentId}/sign-rejection`,
      rejectData,
      REJECT_DOOCUMENT_SIGNING,
      dispatch,
    )
    .catch((error) => {
      dispatch(addError(new Error('FailSendSigningRejection')));
      Sentry.captureException(error);
      return error;
    });

export const updateTaskDocumentValues = (
  taskId,
  path,
  changes,
  triggers,
  schema = {},
) => {
  const {
    auth: { info },
  } = store.getState() || {};

  return {
    type: UPDATE_TASK_DOCUMENT_VALUES,
    payload: { taskId, path, changes, triggers, schema, info },
  };
};

export const handleSilentTriggers = ({
  taskId,
  triggers,
  stepData,
  documentData,
}) => {
  const {
    auth: { info },
  } = store.getState() || {};

  return {
    type: HANDLE_SILENT_TRIGGERS,
    payload: {
      taskId,
      triggers,
      stepData,
      documentData,
      userInfo: info,
    },
  };
};

export const setTaskDocumentValues = (taskId, data) => ({
  type: SET_TASK_DOCUMENTS_VALUES,
  payload: { taskId, data },
});

export const commitTask = (taskId) => (dispatch) =>
  api
    .post(`tasks/${taskId}/commit`, {}, COMMIT_TASK, dispatch)
    .catch((error) => {
      // dispatch(addError(new Error('FailCommitDocument')));
      Sentry.captureException(error);
      return error;
    });

export const toggleCreateTaskDialog = () => ({
  type: TOGGLE_CREATE_TASK_DIALOG,
});

export const generatePDFDocument = (documentId) => (dispatch) =>
  api
    .post(`documents/${documentId}/pdf`, {}, GENERATE_PDF_DOCUMENT, dispatch)
    .then(blobToBase64)
    .then(async (decoded) => {
      dispatch({
        id: documentId,
        type: GET_PDF_DOCUMENT_DECODED,
        payload: decoded,
      });
      return decoded;
    })
    .catch((error) => {
      dispatch(addError(new Error('FailGeneratingDocument')));
      Sentry.captureException(error);
      return error;
    });

export const getPDFDocument =
  ({ documentId }) =>
  (dispatch) =>
    api
      .get(`documents/${documentId}/pdf`, GET_PDF_DOCUMENT, dispatch)
      .catch((error) => {
        dispatch(addError(new Error('FailGettingDocument')));
        Sentry.captureException(error);
        return error;
      });

export const getPDFDocumentDecoded =
  ({ documentId }) =>
  (dispatch) =>
    getPDFDocument({ documentId })(dispatch)
      .then(blobToBase64)
      .then(async (decoded) => {
        dispatch({
          id: documentId,
          type: GET_PDF_DOCUMENT_DECODED,
          payload: decoded,
        });
        return decoded;
      })
      .catch((error) => {
        dispatch(addError(new Error('FailGettingDocument')));
        Sentry.captureException(error);
        return error;
      });

export const uploadDocumentAttach = (documentId, file, labels) => (dispatch) =>
  api
    .upload(
      `documents/${documentId}/attachments`,
      file,
      {
        file_name: encodeURIComponent(file.name),
        labels,
        content_type: file.type || 'application/octet-stream',
      },
      UPLOAD_DOCUMENT_ATTACH,
      dispatch,
    )
    .catch((error) => {
      dispatch(addError(new Error('FailUploadingAttachment')));
      Sentry.captureException(error);
      return error;
    });

export const getDocumentWorkflowFiles = (documentId, step) => (dispatch) =>
  api
    .get(
      `documents/${documentId}/workflow_files?step=${step}`,
      GET_DOCUMENT_WORKFLOW_FILES,
      dispatch,
      {
        documentId,
        step,
      },
    )
    .catch((error) => {
      dispatch(addError(new Error('FailLoadingDocumentWorkflowFiles')));
      Sentry.captureException(error);
      return error;
    });

export const deleteDocumentAttach =
  ({ documentId, id }) =>
  (dispatch) =>
    api
      .del(
        `documents/${documentId}/attachments/${id}`,
        {},
        DELETE_DOCUMENT_ATTACH,
        dispatch,
      )
      .catch((error) => {
        dispatch(addError(new Error('FailDeletingFile')));
        Sentry.captureException(error);
        return error;
      });

export const downloadDocumentAttach =
  ({ documentId, id }, asics = false) =>
  (dispatch) =>
    api
      .get(
        `documents/${documentId}/attachments/${id}?asics=${asics}`,
        DOWNLOAD_DOCUMENT_ATTACH,
        dispatch,
      )
      .then(blobToBase64)
      .then(async (decoded) => {
        dispatch({
          id,
          type: DOWNLOAD_DOCUMENT_ATTACH_DECODED,
          payload: decoded,
        });
        return decoded;
      })
      .catch((error) => {
        dispatch(addError(new Error('FailLoadingFile')));
        Sentry.captureException(error);
        return error;
      });

export const downloadPDFDocument =
  ({ documentId }) =>
  (dispatch) =>
    api
      .get(`documents/${documentId}/pdf`, GET_PDF_DOCUMENT, dispatch)
      .then(blobToBase64)
      .then(async (decoded) => {
        dispatch({
          documentId,
          type: DOWNLOAD_DOCUMENT_ATTACH_DECODED,
          payload: decoded,
        });
        return decoded;
      })
      .catch((error) => {
        dispatch(addError(new Error('FailLoadingFile')));
        Sentry.captureException(error);
        return error;
      });

export const downloadDocumentAttachPreview =
  ({ documentId, id, fileLink }) =>
  (dispatch) =>
    api
      .get(
        `documents/${documentId}/attachments/${id || fileLink}?preview=true`,
        DOWNLOAD_DOCUMENT_ATTACH_PREVIEW,
        dispatch,
      )
      .then(blobToBase64)
      .then(async (decoded) => {
        dispatch({
          id,
          type: DOWNLOAD_DOCUMENT_ATTACH_PREVIEW_DECODED,
          payload: decoded,
        });
        return decoded;
      })
      .catch((error) => {
        // dispatch(addError(new Error('FailLoadingDocumentAttachPreview')));
        Sentry.captureException(error);
        return error;
      });

export const setTaskSigners = (taskId, signerUsers) => (dispatch) =>
  api
    .put(
      `tasks/${taskId}/signers`,
      { signerUsers },
      SET_TASK_SIGNERS,
      dispatch,
      { taskId, signerUsers },
    )
    .catch((error) => {
      dispatch(addError(new Error('FailSettingsTaskSigners')));
      Sentry.captureException(error);
      return error;
    });

export const requestNextTask = (taskId) => (dispatch) =>
  api
    .get(`tasks/${taskId}/last`, REQUEST_NEXT_TASK, dispatch)
    .catch((error) => {
      dispatch(addError(new Error('FailFetchingTask')));
      Sentry.captureException(error);
      return error;
    });

export const setTaskDueDate = (taskId, dueDate) => (dispatch) =>
  api
    .put(`tasks/${taskId}/due-date`, { dueDate }, SET_TASK_DUE_DATE, dispatch, {
      taskId,
    })
    .catch((error) => {
      dispatch(addError(new Error('FailSetTaskDueDate')));
      Sentry.captureException(error);
      return error;
    });

export const downloadDocumentAsicContainer = (documentId) => (dispatch) =>
  api
    .get(`documents/${documentId}/asic`, DOWNLOAD_ASIC_CONTAINER, dispatch, {
      documentId,
    })
    .catch((error) => {
      dispatch(addError(new Error('FailLoadingDocumentAsicContainer')));
      Sentry.captureException(error);
      return error;
    });

export const getMyUnreadTaskCount = () => (dispatch) =>
  api
    .get(
      'tasks/unread/count?filters[finished]=0&filters[deleted]=0&filters[assigned_to]=me&filters[filtered]=false',
      GET_MY_UNREAD_TASK_COUNT,
      dispatch,
    )
    .catch((error) => {
      dispatch(addError(new Error('FailGettingUnreadTaskCount')));
      Sentry.captureException(error);
    });

export const getUnitUnreadTaskCount = () => (dispatch) =>
  api
    .get(
      'tasks/unread/count?filters[finished]=0&filters[deleted]=0&filters[assigned_to]=unit&filters[filtered]=false',
      GET_UNIT_UNREAD_TASK_COUNT,
      dispatch,
    )
    .catch((error) => {
      dispatch(addError(new Error('FailGettingUnreadUnitTaskCount')));
      Sentry.captureException(error);
    });

export const markTaskRead = (taskId) => (dispatch) =>
  api
    .put(
      `tasks/${taskId}/meta`,
      { meta: { isRead: true } },
      MARK_TASK_READ,
      dispatch,
      { taskId },
    )
    .then((result) => {
      getMyUnreadTaskCount()(dispatch);
      getUnitUnreadTaskCount()(dispatch);
      return result;
    })
    .catch((error) => {
      dispatch(addError(new Error('FailMarkTaskRead')));
      Sentry.captureException(error);
      return error;
    });

export const putTaskSigners = (taskId, path) => (dispatch) =>
  api
    .put(
      `tasks/${taskId}/signers/requests?signer_request=${path}`,
      {},
      PUT_TASK_SIGNERS,
      dispatch,
    )
    .catch((error) => {
      dispatch(addError(new Error('FailSettingsTaskSigners')));
      Sentry.captureException(error);
      return error;
    });

export const checkTaskSigners = (taskId, multisignPath) => (dispatch) =>
  api
    .post(
      `tasks/${taskId}/signers/apply?signer_request=${multisignPath}`,
      {},
      CHECK_TASK_SIGNERS,
      dispatch,
    )
    .catch((error) => {
      //  dispatch(addError(new Error('FailCheckingTaskSigners')));
      Sentry.captureException(error);
      return error;
    });

export const deleteSignatures = (documentId) => (dispatch) =>
  api
    .del(`documents/${documentId}/sign`, {}, DELETE_SIGNATURES, dispatch)
    .catch((error) => {
      dispatch(addError(new Error('FailDeletingSignatures')));
      Sentry.captureException(error);
      return error;
    });

export const externalReaderCheckData = (documentId, body) => (dispatch) =>
  api
    .post(
      `documents/${documentId}/external-reader/check`,
      body,
      CHECK_DATA_EXTERNAL_READER,
      dispatch,
    )
    .catch((error) => {
      dispatch(addError(new Error('FailCheckingExternalReader')));
      Sentry.captureException(error);
    });

export const validateDocument = (documentId) => (dispatch) =>
  api
    .post(`documents/${documentId}/validate`, {}, VALIDATE_DOCUMENT, dispatch)
    .catch((error) => {
      //  dispatch(addError(new Error('FailValidatingDocument')));
      Sentry.captureException(error);
      return error;
    });

export const setErrorTaskSigners = (taskId, step) => {
  return {
    type: SET_ERROR_TASK_SIGNERS,
    payload: {
      taskId: taskId,
      step: step,
    },
  };
};
