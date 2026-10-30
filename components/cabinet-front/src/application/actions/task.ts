import * as Sentry from '@sentry/browser';

import * as api from 'services/api';
import { handleSilentTriggers as handleTriggers } from 'components/JsonSchema';
import { addError } from 'actions/error';
import blobToBase64 from 'helpers/blobToBase64';
import isJson from 'helpers/isJson';
import getHeaders, { getHeadersResponse } from 'helpers/getReaderMocks';
import store from 'store';
import storage from 'helpers/storage';

type Dispatch = (action: unknown) => unknown;

const LOAD_TASK = 'LOAD_TASK';
const CREATE_TASK = 'CREATE_TASK';
const COMMIT_TASK = 'COMMIT_TASK';
const LOAD_TASK_DOCUMENT = 'LOAD_TASK_DOCUMENT';
const STORE_TASK_DOCUMENT = 'STORE_TASK_DOCUMENT';
const DELETE_TASK_DOCUMENT = 'DELETE_TASK_DOCUMENT';

const GET_TASK_DOCUMENT_SIGN_DATA = 'GET_TASK_DOCUMENT_SIGN_DATA';
const GET_TASK_DOCUMENT_P7S_SIGN_DATA = 'GET_TASK_DOCUMENT_P7S_SIGN_DATA';
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
const DOWNLOAD_DOCUMENT_ATTACH_PREVIEW_DECODED = 'DOWNLOAD_DOCUMENT_ATTACH_PREVIEW_DECODED';
const UPLOAD_PROTECTED_FILE = 'UPLOAD_PROTECTED_FILE';
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
const VALIDATE_APPLE_SESSION = 'VALIDATE_APPLE_SESSION';

const PUT_TASK_SIGNERS = 'PUT_TASK_SIGNERS';
const CHECK_TASK_SIGNERS = 'CHECK_TASK_SIGNERS';
const GET_UNCREATED_TASK_ID = 'GET_UNCREATED_TASK_ID';
const DELETE_SIGNATURES = 'DELETE_SIGNATURES';
const CHECK_DATA_EXTERNAL_READER = 'CHECK_DATA_EXTERNAL_READER';
const PREPARE_DOCUMENT = 'PREPARE_DOCUMENT';
const VALIDATE_DOCUMENT = 'VALIDATE_DOCUMENT';
const UPDATE_TASK_ASSIGN = 'UPDATE_TASK_ASSIGN';
const HANDLE_SILENT_TRIGGERS = 'HANDLE_SILENT_TRIGGERS';
const INFORM_SIGNERS = 'INFORM_SIGNERS';

const GET_DATA_TO_ENCRYPT = 'GET_DATA_TO_ENCRYPT';
const SAVE_ENCRYPTED_DATA = 'SAVE_ENCRYPTED_DATA';

const UPDATE_TASK_META_DATA = 'UPDATE_TASK_META_DATA';

const CLEAR_EXTERNAL_READER_CACHE = 'CLEAR_EXTERNAL_READER_CACHE';

const SET_ERROR_TASK_SIGNERS = 'SET_ERROR_TASK_SIGNERS';

const UPDATE_VERIFIED_USER_INFO = 'UPDATE_VERIFIED_USER_INFO';

const GET_DATA_EXTERNAL_REGISTER_READER_LIST = 'GET_DATA_EXTERNAL_REGISTER_READER_LIST';

export const updateTaskAssign = (taskId: string | number, newPerformerUsers: unknown) => (dispatch: Dispatch) =>
  api
    .post(`tasks/${taskId}/assign`, { newPerformerUsers }, UPDATE_TASK_ASSIGN, dispatch)
    .catch((error) => {
      Sentry.captureException(error);
      return error;
    });

export const confirmSmsCode = (body: unknown) => (dispatch: Dispatch) =>
  api
    .post('payment/ebabyEasyPaySms/confirm_code', body, CONFIRM_SMS_CODE, dispatch)
    .catch((error) => {
      dispatch(addError(new Error('FailConfirmingSmsCode')));
      Sentry.captureException(error);
    });

export const getPaymentInfo = (id: string | number, body: unknown) => (dispatch: Dispatch) =>
  api.post(`documents/${id}/calc_payment`, body, GET_PAYMENT_INFO, dispatch).catch((error) => {
    const { message } = error as { message: string };

    if (!isJson(message)) {
      const typicalErrors = [
        "Error: Can't find recipient banking details.",
        "Error: Can't define pay type for this phone number.",
        "Error: User phone is not defined. Can't get payment data."
      ];
      const exists = typicalErrors.filter((mss) => message === mss);
      dispatch(addError(new Error(exists.length ? message : 'FailGettingPaymentInfo')));
    } else if (isJson(message)) {
      const messageJson = JSON.parse(message);
      const { fieldErrors, error_message } = messageJson;
      const string = (fieldErrors || []).map(({ errorMessage }: { errorMessage: string }) => errorMessage).join('\n');
      const undefinedMessage = messageJson.errorMessage || JSON.stringify(messageJson);
      const fullMessage = string
        ? `Помилка провайдера оплати: ${messageJson.errorMessage} - ${string} `
        : `Помилка провайдера оплати: ${undefinedMessage}`;
      dispatch(addError(new Error(fullMessage || error_message)));
    }
    Sentry.captureException(error);
  });

export const getPaymentStatus = (id: string | number) => (dispatch: Dispatch) =>
  api.get(`documents/${id}`, GET_PAYMENT_STATUS, dispatch).catch((error) => {
    dispatch(addError(new Error('FailGettingPaymentStatus')));
    Sentry.captureException(error);
  });

export const getPaymentReceipt =
  ({ payment_path, document_id, order_id }: { payment_path: string; document_id: string | number; order_id: string | number }) =>
  (dispatch: Dispatch) =>
    api
      .get(
        `payment/receipt?payment_path=${payment_path}&document_id=${document_id}&order_id=${order_id}`,
        GET_PAYMENT_RECEIPT,
        dispatch
      )
      .catch((error) => {
        dispatch(addError(new Error('FailGettingPaymentStatus')));
        Sentry.captureException(error);
      });

export const calculateFields =
  (taskId: string | number, { id, body }: { id: string | number; body: unknown }) =>
  (dispatch: Dispatch) =>
    api
      .post(`documents/${id}/calc`, body, CALCULATE_FIELDS, dispatch, {
        taskId
      })
      .catch((error) => {
        dispatch(addError(new Error('FailCalculating')));
        Sentry.captureException(error);
      });

export const setTaskScreen = (taskId: string | number, screen: unknown) => ({
  type: SET_TASK_SCREEN,
  payload: { taskId, screen }
});

export const clearStepAndScreen = (taskId: string | number) => ({
  type: CLEAR_TASK_STEP_AND_SCREEN,
  payload: { taskId }
});

export const setTaskStep = (taskId: string | number, step: unknown) => ({
  type: SET_TASK_STEP,
  payload: { taskId, step }
});

export const applyDocumentDiffs = (taskId: string | number, diffs: unknown, path: (string | number)[], options: Record<string, unknown> = {}) => {
  const {
    auth: { info }
  } = store.getState() || {};

  return {
    type: 'APPLY_DOCUMENT_DIFFS',
    payload: { taskId, diffs, path, options: { ...options, info } }
  };
};

export const getUncreatedTaskId = (workflowId: string | number, taskTemplateId: string | number) => (dispatch: Dispatch) =>
  api
    .get(`tasks/last/${workflowId}/${taskTemplateId}`, GET_UNCREATED_TASK_ID, dispatch)
    .catch((error) => {
      // dispatch(addError(new Error('FailFetchingTask')));
      Sentry.captureException(error);
      return error;
    });

export const loadTask = (taskId: string | number) => (dispatch: Dispatch) =>
  api.get(`tasks/${taskId}`, LOAD_TASK, dispatch).catch((error) => {
    // dispatch(addError(new Error('FailFetchingTask')));
    Sentry.captureException(error);
    return error;
  });

export const createTask = (data: unknown) => (dispatch: Dispatch) =>
  api
    // getHeaders ignores its argument (it never reads a `dispatch` param); the call here
    // matches its real 0-arg signature rather than the original's unused pass-through.
    .post('tasks', data, CREATE_TASK, dispatch, {}, { headers: getHeaders() as unknown as Record<string, string> })
    .then((responseValue) => {
      const response = responseValue as Response;
      const returnedMocks = response.headers.get('Returned-Mocks');
      getHeadersResponse(dispatch, returnedMocks);
      return response;
    })
    .catch((error) => {
      // dispatch(addError(new Error('FailCreatingTask')));
      Sentry.captureException(error);

      return error;
    });

export const loadTaskDocument = (documentId: string | number) => (dispatch: Dispatch) =>
  api
    .get(`documents/${documentId}`, LOAD_TASK_DOCUMENT, dispatch, {
      documentId
    })
    .catch((error) => {
      dispatch(addError(new Error('FailLoadingDocument')));
      Sentry.captureException(error);
      return error;
    });

export const storeTaskDocument =
  ({ task, data, params }: { task: { documentId: string | number; id: string | number }; data: unknown; params: string }) =>
  (dispatch: Dispatch) =>
    api
      .put(`documents/${task.documentId}${params}`, data, STORE_TASK_DOCUMENT, dispatch, { task })
      .catch((error) => {
        if (error.message === 'DraftExpiredError: Draft is already expired.') {
          dispatch(addError(new Error('DraftExpired')));
        } else {
          dispatch(addError(new Error('FailUpdatingDocument')));
        }
        // Sentry.captureException(error);
        loadTask(task.id)(dispatch);
        return error;
      });

export const deleteTaskDocument = (taskId: string | number) => ({
  type: DELETE_TASK_DOCUMENT,
  payload: { taskId }
});

export const getTaskDocumentSignData = (documentId: string | number) => (dispatch: Dispatch) =>
  api.get(`documents/${documentId}/sign`, GET_TASK_DOCUMENT_SIGN_DATA, dispatch).catch((error) => {
    dispatch(addError(new Error('FailGettingSignData')));
    Sentry.captureException(error);
    return error;
  });

export const getTaskDocumentP7SSignData = (documentId: string | number, attachmentId?: string | number) => (dispatch: Dispatch) => {
  let url = `documents/${documentId}/sign_p7s`;

  if (attachmentId) {
    url += `?attachment_id=${attachmentId}`;
  }

  return api.get(url, GET_TASK_DOCUMENT_P7S_SIGN_DATA, dispatch, null, {
    rawFile: true
  });
};

export const signTaskDocument =
  (documentId: string | number, signature: unknown, signInfo: { type?: string } | undefined, commit = true) =>
  (dispatch: Dispatch) =>
    api
      .post(
        `documents/${documentId}/sign?commit=${commit}&type=${signInfo?.type}`,
        signature === undefined ? {} : { signature },
        SIGN_DOCUMENT,
        dispatch
      )
      .catch((error) => {
        Sentry.captureException(error);
        return error;
      });

export const getTaskDocumentAdditional = (documentId: string | number) => (dispatch: Dispatch) =>
  api.get(`documents/${documentId}/sign_additional_p7s`, GET_DOCUMENT_ADDITIONAL, dispatch);

export const signTaskDocumentAdditional = (documentId: string | number, params: unknown) => (dispatch: Dispatch) =>
  api
    .post(
      `documents/${documentId}/sign_additional_p7s`,
      params || {},
      SIGN_DOCUMENT_ADDITIONAL,
      dispatch
    )
    .catch((error) => {
      if (error?.message !== 'Error: User already signed document additional data.') {
        throw error;
      }
    });

export const getDataToEncrypt = (documentId: string | number) => (dispatch: Dispatch) =>
  api.get(`documents/${documentId}/encrypt`, GET_DATA_TO_ENCRYPT, dispatch).catch((error) => {
    Sentry.captureException(error);
    return error;
  });

export const saveEncryptedData = (documentId: string | number, encrypted: unknown) => (dispatch: Dispatch) =>
  api
    .post(`documents/${documentId}/encrypt`, { encrypted }, SAVE_ENCRYPTED_DATA, dispatch)
    .catch((error) => {
      Sentry.captureException(error);
      return error;
    });

export const signTaskDocumentP7S = (documentId: string | number, p7sSignature: unknown, attachmentId?: string | number) => (dispatch: Dispatch) => {
  let url = `documents/${documentId}/sign_p7s`;

  if (attachmentId) {
    url += `?attachment_id=${attachmentId}`;
  }

  return api
    .post(url, p7sSignature === undefined ? {} : { p7sSignature }, SIGN_DOCUMENT, dispatch)
    .catch((error) => {
      Sentry.captureException(error);
      return error;
    });
};

export const rejectDocumentSigning = (documentId: string | number, rejectData: unknown) => (dispatch: Dispatch) =>
  api
    .post(`documents/${documentId}/sign-rejection`, rejectData, REJECT_DOOCUMENT_SIGNING, dispatch)
    .catch((error) => {
      dispatch(addError(new Error('FailSendSigningRejection')));
      Sentry.captureException(error);
      return error;
    });

export const updateTaskDocumentValues = (
  taskId: string | number,
  path: (string | number)[],
  changes: unknown,
  triggers: unknown,
  schema: unknown = {},
  updateOrigin = false,
  onlyThisValue = false
) => {
  const {
    auth: { info },
    documentTemplate
  } = store.getState() || {};

  return {
    type: UPDATE_TASK_DOCUMENT_VALUES,
    payload: {
      taskId,
      path,
      changes,
      triggers,
      schema,
      info,
      documentTemplate,
      updateOrigin,
      onlyThisValue
    }
  };
};

export const handleSilentTriggers =
  ({ taskId, triggers, stepData, documentData, actions, activityLog }: {
    taskId: string | number;
    triggers: unknown;
    stepData: unknown;
    documentData: unknown;
    actions: unknown;
    activityLog: unknown;
  }) =>
  async (dispatch: Dispatch) => {
    const {
      auth: { info: userInfo }
    } = store.getState() || {};

    const data = await handleTriggers({
      ...JSON.parse(
        JSON.stringify({
          origin: documentData,
          triggers,
          stepData,
          documentData,
          userInfo
        })
      ),
      actions,
      activityLog
    });

    return dispatch({
      type: HANDLE_SILENT_TRIGGERS,
      payload: {
        taskId,
        data
      }
    });
  };

export const setTaskDocumentValues = (taskId: string | number, data: unknown) => ({
  type: SET_TASK_DOCUMENTS_VALUES,
  payload: { taskId, data }
});

export const commitTask = (taskId: string | number) => (dispatch: Dispatch) =>
  api.post(`tasks/${taskId}/commit`, {}, COMMIT_TASK, dispatch).catch((error) => {
    // dispatch(addError(new Error('FailCommitDocument')));
    Sentry.captureException(error);
    return error;
  });

export const toggleCreateTaskDialog = () => ({
  type: TOGGLE_CREATE_TASK_DIALOG
});

export const generatePDFDocument =
  (documentId: string | number, largeFile = false) =>
  (dispatch: Dispatch) => {
    const lang = storage.getItem('lang');
    let url = `documents/${documentId}/pdf${lang ? '?lang=' + lang : ''}`;

    if (largeFile) {
      url = `documents/${documentId}/large-pdf`;
    }

    return api
      .post(url, {}, GENERATE_PDF_DOCUMENT, dispatch)
      .then(blobToBase64)
      .then(async (decoded) => {
        dispatch({
          id: documentId,
          type: GET_PDF_DOCUMENT_DECODED,
          payload: decoded
        });
        return decoded;
      })
      .catch((error) => {
        // dispatch(addError(new Error('FailGeneratingDocument')));
        Sentry.captureException(error);
        return error;
      });
  };

export const getPDFDocument =
  ({ documentId }: { documentId: string | number }) =>
  (dispatch: Dispatch) =>
    api.get(`documents/${documentId}/pdf`, GET_PDF_DOCUMENT, dispatch).catch((error) => {
      // dispatch(addError(new Error('FailGettingDocument')));
      Sentry.captureException(error);
      return error;
    });

export const getPDFDocumentDecoded =
  ({ documentId }: { documentId: string | number }) =>
  (dispatch: Dispatch) =>
    getPDFDocument({ documentId })(dispatch)
      .then(blobToBase64)
      .then(async (decoded) => {
        dispatch({
          id: documentId,
          type: GET_PDF_DOCUMENT_DECODED,
          payload: decoded
        });
        return decoded;
      })
      .catch((error) => {
        // dispatch(addError(new Error('FailGettingDocument')));
        Sentry.captureException(error);
        return error;
      });

export const uploadDocumentAttach =
  (documentId: string | number, file: File & { origin_type?: string }, labels: unknown, documentPath: unknown, meta: unknown, fileName: string) => (dispatch: Dispatch) =>
    api
      .upload(
        `documents/${documentId}/attachments`,
        file,
        {
          file_name: encodeURIComponent(fileName),
          labels,
          document_path: documentPath,
          content_type: file.origin_type || file.type || 'application/octet-stream',
          meta: meta && encodeURIComponent(JSON.stringify(meta))
        },
        UPLOAD_DOCUMENT_ATTACH,
        dispatch
      )
      .catch((error) => {
        dispatch(addError(new Error('FailUploadingAttachment')));
        Sentry.captureException(error);
        return error;
      });

export const getDocumentWorkflowFiles = (documentId: string | number, step: unknown) => (dispatch: Dispatch) =>
  api
    .get(
      `documents/${documentId}/workflow_files?step=${step}`,
      GET_DOCUMENT_WORKFLOW_FILES,
      dispatch,
      {
        documentId,
        step
      }
    )
    .catch((error) => {
      dispatch(addError(new Error('FailLoadingDocumentWorkflowFiles')));
      Sentry.captureException(error);
      return error;
    });

export const deleteDocumentAttach =
  ({ documentId, id }: { documentId: string | number; id: string | number }) =>
  (dispatch: Dispatch) =>
    api
      .del(`documents/${documentId}/attachments/${id}`, {}, DELETE_DOCUMENT_ATTACH, dispatch)
      .catch((error) => {
        dispatch(addError(new Error('FailDeletingFile')));
        Sentry.captureException(error);
        return error;
      });

export const downloadDocumentAttach =
  ({ documentId, id, hasP7sSignature }: { documentId: string | number; id: string | number; hasP7sSignature?: boolean }, asics = false) =>
  (dispatch: Dispatch) =>
    api
      .get(
        `documents/${documentId}/attachments/${id}?asics=${asics}${
          hasP7sSignature ? '&p7s=true' : ''
        }`,
        DOWNLOAD_DOCUMENT_ATTACH,
        dispatch
      )
      .then(blobToBase64)
      .then(async (decoded) => {
        dispatch({
          id,
          type: DOWNLOAD_DOCUMENT_ATTACH_DECODED,
          payload: decoded
        });
        return decoded;
      })
      .catch((error) => {
        dispatch(addError(new Error('FailLoadingFile')));
        Sentry.captureException(error);
        return error;
      });

export const downloadPDFDocument =
  ({ documentId }: { documentId: string | number }) =>
  (dispatch: Dispatch) =>
    api
      .get(`documents/${documentId}/pdf`, GET_PDF_DOCUMENT, dispatch)
      .then(blobToBase64)
      .then(async (decoded) => {
        dispatch({
          documentId,
          type: DOWNLOAD_DOCUMENT_ATTACH_DECODED,
          payload: decoded
        });
        return decoded;
      })
      .catch((error) => {
        // dispatch(addError(new Error('FailLoadingFile')));
        Sentry.captureException(error);
        return error;
      });

// Deleted ?preview=true query
export const downloadDocumentAttachPreview =
  ({ documentId, id, fileLink }: { documentId: string | number; id?: string | number; fileLink?: string | number }) =>
  (dispatch: Dispatch) =>
    api
      .get(
        `documents/${documentId}/attachments/${id || fileLink}`,
        DOWNLOAD_DOCUMENT_ATTACH_PREVIEW,
        dispatch
      )
      .then(blobToBase64)
      .then(async (decoded) => {
        dispatch({
          id,
          type: DOWNLOAD_DOCUMENT_ATTACH_PREVIEW_DECODED,
          payload: decoded
        });
        return decoded;
      })
      .catch((error) => {
        // dispatch(addError(new Error('FailLoadingDocumentAttachPreview')));
        Sentry.captureException(error);
        return error;
      });

export const downloadProtectedFile =
  ({ keyId, attachId, recordId, path, preview, p7s }: {
    keyId: string | number;
    attachId: string | number;
    recordId: string | number;
    path: string;
    preview: boolean;
    p7s: boolean;
  }) =>
  (dispatch: Dispatch) =>
    api
      .get(
        `protected-files/keys/${keyId}/records/${recordId}?path=${path}&preview=${preview}&p7s=${p7s}`,
        DOWNLOAD_DOCUMENT_ATTACH,
        dispatch
      )
      .then(blobToBase64)
      .then(async (decoded) => {
        dispatch({
          id: attachId,
          type: DOWNLOAD_DOCUMENT_ATTACH_DECODED,
          payload: decoded
        });
        return decoded;
      })
      .catch((error) => {
        Sentry.captureException(error);
        return error;
      });

export const uploadProtectedFile =
  ({ file, file_name }: { file: File; file_name: string }) =>
  (dispatch: Dispatch) =>
    api
      .upload(
        'protected-files',
        file,
        {
          file_name
        },
        UPLOAD_PROTECTED_FILE,
        dispatch
      )
      .catch((error) => {
        dispatch(addError(new Error('FailLoadingFile')));
        Sentry.captureException(error);
      });

export const setTaskSigners = (taskId: string | number, signerUsers: unknown) => (dispatch: Dispatch) =>
  api
    .put(`tasks/${taskId}/signers`, { signerUsers }, SET_TASK_SIGNERS, dispatch, {
      taskId,
      signerUsers
    })
    .catch((error) => {
      dispatch(addError(new Error('FailSettingsTaskSigners')));
      Sentry.captureException(error);
      return error;
    });

export const requestNextTask = (taskId: string | number) => (dispatch: Dispatch) =>
  api.get(`tasks/${taskId}/last`, REQUEST_NEXT_TASK, dispatch).catch((error) => {
    dispatch(addError(new Error('FailFetchingTask')));
    Sentry.captureException(error);
    return error;
  });

export const setTaskDueDate = (taskId: string | number, dueDate: unknown) => (dispatch: Dispatch) =>
  api
    .put(`tasks/${taskId}/due-date`, { dueDate }, SET_TASK_DUE_DATE, dispatch, {
      taskId
    })
    .catch((error) => {
      dispatch(addError(new Error('FailSetTaskDueDate')));
      Sentry.captureException(error);
      return error;
    });

export const downloadDocumentAsicContainer = (documentId: string | number) => (dispatch: Dispatch) =>
  api
    .get(`documents/${documentId}/asic`, DOWNLOAD_ASIC_CONTAINER, dispatch, {
      documentId
    })
    .catch((error) => {
      dispatch(addError(new Error('FailLoadingDocumentAsicContainer')));
      Sentry.captureException(error);
      return error;
    });

export const getMyUnreadTaskCount = () => (dispatch: Dispatch) =>
  api
    .get(
      'tasks/unread/count?filters[finished]=0&filters[deleted]=0&filters[assigned_to]=me',
      GET_MY_UNREAD_TASK_COUNT,
      dispatch
    )
    .catch((error) => {
      dispatch(addError(new Error('FailGettingUnreadTaskCount')));
      Sentry.captureException(error);
    });

export const getUnitUnreadTaskCount = () => (dispatch: Dispatch) =>
  api
    .get(
      'tasks/unread/count?filters[finished]=0&filters[deleted]=0&filters[assigned_to]=unit',
      GET_UNIT_UNREAD_TASK_COUNT,
      dispatch
    )
    .catch((error) => {
      dispatch(addError(new Error('FailGettingUnreadUnitTaskCount')));
      Sentry.captureException(error);
    });

export const setTaskMeta = (taskId: string | number, meta: unknown) => (dispatch: Dispatch) =>
  api.put(`tasks/${taskId}/meta`, { meta }, UPDATE_TASK_META_DATA, dispatch);

export const markTaskRead = (taskId: string | number) => (dispatch: Dispatch) =>
  api
    .put(`tasks/${taskId}/meta`, { meta: { isRead: true } }, MARK_TASK_READ, dispatch, { taskId })
    .then(async (result) => {
      await getMyUnreadTaskCount()(dispatch);
      await getUnitUnreadTaskCount()(dispatch);
      return result;
    })
    .catch((error) => {
      dispatch(addError(new Error('FailMarkTaskRead')));
      Sentry.captureException(error);
      return error;
    });

export const setStartPDFGenerationTime =
  (taskId: string | number, time: unknown = null) =>
  (dispatch: Dispatch) =>
    api.put(
      `tasks/${taskId}/meta`,
      { meta: { startPDFGenerationTime: time } },
      UPDATE_TASK_META_DATA,
      dispatch,
      { taskId, time }
    );

export const setDefaultValueExecuted = (taskId: string | number, defaultValueExecuted: unknown) => (dispatch: Dispatch) =>
  api.put(
    `tasks/${taskId}/meta`,
    { meta: { defaultValueExecuted } },
    UPDATE_TASK_META_DATA,
    dispatch,
    { defaultValueExecuted }
  );

export const setHandleTaskData = (taskId: string | number, handling: unknown) => (dispatch: Dispatch) =>
  api.put(`tasks/${taskId}/meta`, { meta: { handling } }, UPDATE_TASK_META_DATA, dispatch, {
    handling
  });

export const putTaskSigners = (taskId: string | number, path: string) => (dispatch: Dispatch) =>
  api
    .put(`tasks/${taskId}/signers/requests?signer_request=${path}`, {}, PUT_TASK_SIGNERS, dispatch)
    .catch((error) => {
      dispatch(addError(new Error('FailSettingsTaskSigners')));
      Sentry.captureException(error);
      return error;
    });

export const setErrorTaskSigners = (taskId: string | number, step: unknown) => {
  return {
    type: SET_ERROR_TASK_SIGNERS,
    payload: {
      taskId: taskId,
      step: step
    }
  };
};

export const checkTaskSigners = (taskId: string | number, multisignPath: string) => (dispatch: Dispatch) =>
  api
    .post(
      `tasks/${taskId}/signers/apply?signer_request=${multisignPath}`,
      {},
      CHECK_TASK_SIGNERS,
      dispatch
    )
    .catch((error) => {
      //  dispatch(addError(new Error('FailCheckingTaskSigners')));
      Sentry.captureException(error);
      return error;
    });

export const deleteSignatures = (documentId: string | number) => (dispatch: Dispatch) =>
  api.del(`documents/${documentId}/sign`, {}, DELETE_SIGNATURES, dispatch).catch((error) => {
    dispatch(addError(new Error('FailDeletingSignatures')));
    Sentry.captureException(error);
    return error;
  });

export const externalReaderCheckData = (documentId: string | number, body: unknown, isIgnore: boolean, async: boolean) => (dispatch: Dispatch) =>
  api
    .post(
      `documents/${documentId}/external-reader/check${async ? '/async' : ''}`,
      body,
      CHECK_DATA_EXTERNAL_READER,
      dispatch,
      {},
      // getHeaders ignores its argument; see createTask above for the same call-site fix.
      { headers: getHeaders() as unknown as Record<string, string> },
      isIgnore
    )
    .then((responseValue) => {
      const response = responseValue as Response;
      const returnedMocks = response.headers.get('Returned-Mocks');
      getHeadersResponse(dispatch, returnedMocks);
      return response;
    })
    .catch((error) => {
      Sentry.captureException(error);
      return error;
    });

export const getExternalReaderData = (body: unknown) => (dispatch: Dispatch) =>
  api
    .post('external_reader', body, 'GET_DATA_EXTERNAL_REGISTER_READER', dispatch)
    .catch((error) => {
      Sentry.captureException(error);
      return error;
    });

export const validateDocument =
  (documentId: string | number, showError: boolean, commit = false) =>
  (dispatch: Dispatch) =>
    api
      .post(`documents/${documentId}/validate?commit=${commit}`, {}, VALIDATE_DOCUMENT, dispatch)
      .catch((error) => {
        Sentry.captureException(error);
        if (showError) {
          dispatch(addError(new Error('FailValidatingDocument')));
        }
        return error;
      });

export const prepareDocument = (documentId: string | number) => (dispatch: Dispatch) =>
  api.post(`documents/${documentId}/prepare`, {}, PREPARE_DOCUMENT, dispatch);

export const validateAppleSession = (body: unknown) => (dispatch: Dispatch) =>
  api.post('validate_apple_pay_session', body, VALIDATE_APPLE_SESSION, dispatch).catch((error) => {
    dispatch(addError(new Error('FailValidatingAppleSession')));
    Sentry.captureException(error);
  });

export const clearExternalReaderCache = () => (dispatch: Dispatch) =>
  api.del('external_reader/cache', {}, CLEAR_EXTERNAL_READER_CACHE, dispatch).catch((error) => {
    dispatch(addError(new Error('FailClearExternalReaderCache')));
    Sentry.captureException(error);
  });

export const informSigners = (documentId: string | number) => (dispatch: Dispatch) =>
  api.post(`documents/${documentId}/continue-sign`, {}, INFORM_SIGNERS, dispatch).catch((error) => {
    dispatch(addError(new Error('FailInformingSigners')));
    // Sentry.captureException(error);
    return error;
  });

export const signCheckAction = (documentId: string | number) => (dispatch: Dispatch) =>
  api.post(`documents/${documentId}/singlesign/check`, {}, 'SIGN_CHECK', dispatch);

export const multisignCheck = (documentId: string | number) => (dispatch: Dispatch) =>
  api.post(`documents/${documentId}/multisign/check`, {}, 'MULTISIGN_CHECK', dispatch);

export const updateVerifiedUserInfo = (id: string | number) => (dispatch: Dispatch) =>
  api
    .put(
      `documents/${id}/verified-user-info`,
      {},
      UPDATE_VERIFIED_USER_INFO,
      dispatch,
      {},
      // getHeaders ignores its argument; see createTask above for the same call-site fix.
      { headers: getHeaders() as unknown as Record<string, string> }
    )
    .then((responseValue) => {
      const response = responseValue as Response;
      const returnedMocks = response.headers.get('Returned-Mocks');
      getHeadersResponse(dispatch, returnedMocks);
      return response;
    })
    .catch((error) => {
      dispatch(addError(new Error('FailGettingVerifiedUserInfo')));
      return error;
    });

export const deleteDraft = (id: string | number) => (dispatch: Dispatch) =>
  api.del(`tasks/${id}`, {}, 'DELETE_DRAFT', dispatch).catch((error) => {
    dispatch(addError(new Error('FailDeletingDraft')));
    return error;
  });

export const getExternalReaderCaptcha = (service: string, method: string) => (dispatch: Dispatch) =>
  api
    .get(`external_reader/captcha/${service}/${method}`, 'GET_EXTERNAL_READER_CAPTCHA', dispatch)
    .catch((error) => {
      Sentry.captureException(error);
      return error;
    });

export const getExternalReaderCaptchaList = () => (dispatch: Dispatch) =>
  api
    .get('external_reader/captcha/providers/list', GET_DATA_EXTERNAL_REGISTER_READER_LIST, dispatch)
    .catch((error) => {
      dispatch(addError(new Error('FailGettingUnreadTaskCount')));
      Sentry.captureException(error);
    });
