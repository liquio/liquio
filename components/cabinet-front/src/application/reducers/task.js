import objectPath from 'object-path';
import _ from 'lodash/fp';
import diff from 'deep-diff';

import { ChangeEvent, handleTriggers } from 'components/JsonSchema';

import getDeltaProperties from 'helpers/getDeltaProperties';

const UPDATE_TASK_ASSIGN_SUCCESS = 'UPDATE_TASK_ASSIGN_SUCCESS';
const LOAD_TASK_SUCCESS = 'LOAD_TASK_SUCCESS';
const SET_TASK_DOCUMENTS_VALUES = 'SET_TASK_DOCUMENTS_VALUES';
const UPDATE_TASK_DOCUMENT_VALUES = 'UPDATE_TASK_DOCUMENT_VALUES';
const LOAD_TASK_DOCUMENT_SUCCESS = 'LOAD_TASK_DOCUMENT_SUCCESS';
const STORE_TASK_DOCUMENT_SUCCESS = 'STORE_TASK_DOCUMENT_SUCCESS';
const DELETE_TASK_DOCUMENT = 'DELETE_TASK_DOCUMENT';
const TOGGLE_CREATE_TASK_DIALOG = 'TOGGLE_CREATE_TASK_DIALOG';
const GET_DOCUMENT_WORKFLOW_FILES_SUCCESS = 'GET_DOCUMENT_WORKFLOW_FILES_SUCCESS';
const SET_TASK_SIGNERS_SUCCESS = 'SET_TASK_SIGNERS_SUCCESS';
const SET_TASK_SCREEN = 'SET_TASK_SCREEN';
const CLEAR_TASK_STEP_AND_SCREEN = 'CLEAR_TASK_STEP_AND_SCREEN';
const SET_TASK_STEP = 'SET_TASK_STEP';
const UPDATE_TASK_META_DATA_SUCCESS = 'UPDATE_TASK_META_DATA_SUCCESS';
const PREPARE_DOCUMENT_SUCCESS = 'PREPARE_DOCUMENT_SUCCESS';

const SIGN_DOCUMENT_SUCCESS = 'SIGN_DOCUMENT_SUCCESS';
const SET_TASK_DUE_DATE_SUCCESS = 'SET_TASK_DUE_DATE_SUCCESS';
const REJECT_DOOCUMENT_SIGNING_SUCCESS = 'REJECT_DOOCUMENT_SIGNING_SUCCESS';

const GET_MY_UNREAD_TASK_COUNT_SUCCESS = 'GET_MY_UNREAD_TASK_COUNT_SUCCESS';
const GET_UNIT_UNREAD_TASK_COUNT_SUCCESS = 'GET_UNIT_UNREAD_TASK_COUNT_SUCCESS';
const CALCULATE_FIELDS_SUCCESS = 'CALCULATE_FIELDS_SUCCESS';
const REQUEST_REGISTER_KEY_RECORDS_FILTER_SUCCESS =
  'REGISTRY/REQUEST_REGISTER_KEY_RECORDS_FILTER_SUCCESS';
const DELETE_SIGNATURES_SUCCESS = 'DELETE_SIGNATURES_SUCCESS';
const HANDLE_SILENT_TRIGGERS = 'HANDLE_SILENT_TRIGGERS';
const CHECK_DATA_EXTERNAL_READER_SUCCESS = 'CHECK_DATA_EXTERNAL_READER_SUCCESS';
const SET_ERROR_TASK_SIGNERS = 'SET_ERROR_TASK_SIGNERS';
const UPDATE_VERIFIED_USER_INFO_SUCCESS = 'UPDATE_VERIFIED_USER_INFO_SUCCESS';

const initialState = {
  showCreateDialog: false,
  errors: [],
  loading: false,
  actual: {},
  screens: {},
  steps: {},
  documents: {},
  workflowFiles: {},
  origin: {},
  unreadMyCount: 0,
  unreadUnitCount: 0
};

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case UPDATE_TASK_ASSIGN_SUCCESS: {
      const { id: taskId, performerUsers, performerUserNames } = action.payload;
      const task = {
        ...state.actual[taskId],
        performerUsers,
        performerUserNames
      };
      return {
        ...state,
        actual: { ...state.actual, [taskId]: task },
        origin: { ...state.origin, [taskId]: JSON.parse(JSON.stringify(task)) }
      };
    }
    case SET_TASK_SCREEN: {
      const { taskId, screen } = action.payload;
      return {
        ...state,
        screens: {
          ...state.screens,
          [taskId]: screen
        }
      };
    }
    case CLEAR_TASK_STEP_AND_SCREEN: {
      const { taskId } = action.payload;

      return {
        ...state,
        screens: Object.keys(state.screens)
          .filter((id) => id !== taskId)
          .reduce(
            (acc, id) => ({
              ...acc,
              [id]: state.screens[id]
            }),
            {}
          ),
        steps: Object.keys(state.steps)
          .filter((id) => id !== taskId)
          .reduce(
            (acc, id) => ({
              ...acc,
              [id]: state.steps[id]
            }),
            {}
          )
      };
    }
    case SET_TASK_STEP: {
      const { taskId, step } = action.payload;
      return {
        ...state,
        steps: {
          ...state.steps,
          [taskId]: step
        }
      };
    }
    case UPDATE_TASK_META_DATA_SUCCESS: {
      const { id: taskId, meta } = action.payload;

      return {
        ...state,
        actual: {
          ...state.actual,
          [taskId]: {
            ...state.actual[taskId],
            meta
          }
        },
        origin: {
          ...state.origin,
          [taskId]: {
            ...state.origin[taskId],
            meta
          }
        }
      };
    }
    case LOAD_TASK_SUCCESS: {
      const task = action.payload;
      const { lastUpdateLogId } = state.origin[task.id] || {};

      return {
        ...state,
        actual: { ...state.actual, [task.id]: task },
        origin: {
          ...state.origin,
          [task.id]: {
            ...JSON.parse(JSON.stringify(task)),
            lastUpdateLogId
          }
        }
      };
    }
    case UPDATE_VERIFIED_USER_INFO_SUCCESS: {
      const document = action.payload;

      const task = Object.values(state.origin).find(({ documentId }) => documentId === document.id);

      task.document.data = document.data;

      return {
        ...state,
        actual: { ...state.actual, [task.id]: task },
        origin: {
          ...state.origin,
          [task.id]: JSON.parse(JSON.stringify(task))
        }
      };
    }
    case SET_TASK_SIGNERS_SUCCESS: {
      const { id: taskId } = action.payload;
      const { document } = state.actual[taskId];
      const task = { ...action.payload, document };
      return {
        ...state,
        actual: { ...state.actual, [task.id]: task },
        origin: {
          ...state.origin,
          [task.id]: JSON.parse(JSON.stringify(task))
        }
      };
    }
    case SET_TASK_DOCUMENTS_VALUES: {
      const { taskId, data } = action.payload;
      const task = state.actual[taskId];

      return {
        ...state,
        actual: {
          ...state.actual,
          [taskId]: {
            ...task,
            document: {
              ...task?.document,
              data
            }
          }
        }
      };
    }
    case 'APPLY_DOCUMENT_DIFFS': {
      const {
        taskId,
        diffs,
        path,
        options: { triggers, info }
      } = action.payload;
      const task = state.actual[taskId];
      let documentData = task.document.data;

      if (!diffs) {
        return state;
      }

      diffs.forEach((documentDiff) => {
        let changedObject = objectPath.get(documentData, path);
        const changes = documentDiff.rhs || documentDiff?.item?.rhs;

        try {
          changedObject = JSON.parse(JSON.stringify(changedObject));
        } catch (e) {
          changedObject = [];
        }

        diff.applyChange(changedObject, true, documentDiff);
        // objectPath.set(changedObject, documentDiff.path || documentDiff.index, changes);
        objectPath.set(documentData, path, changedObject);

        const fullPath = path.concat(documentDiff.path).filter((item) => item !== undefined);
        const dataPath = fullPath.join('.');
        const parentPath = path.slice(0, path.length - 1);
        const parentData = objectPath.get(documentData, parentPath);

        documentData = handleTriggers(
          documentData,
          triggers,
          dataPath,
          changes,
          documentData[fullPath[0]],
          documentData,
          parentData,
          info
        );
      });

      const parentPath = path.slice(0, path.length - 1);
      const parentData = objectPath.get(documentData, parentPath);
      const changesData = objectPath.get(documentData, path);

      documentData = handleTriggers(
        documentData,
        triggers,
        path.join('.'),
        changesData,
        documentData[path[0]],
        documentData,
        parentData,
        info
      );

      if (!diff(state.actual[taskId].document.data, documentData)) {
        return state;
      }

      return {
        ...state,
        actual: {
          ...state.actual,
          [taskId]: {
            ...task,
            document: {
              ...task.document,
              data: JSON.parse(JSON.stringify(documentData))
            }
          }
        }
      };
    }
    case UPDATE_TASK_DOCUMENT_VALUES: {
      const {
        taskId,
        path,
        changes,
        triggers,
        schema: { allowNull },
        info,
        documentTemplate,
        updateOrigin,
        onlyThisValue
      } = action.payload;
      let task;

      try {
        task = JSON.parse(JSON.stringify(state.actual[taskId]));
      } catch (e) {
        return state;
      }

      const dataPath = path.join('.');

      let changesData = changes instanceof ChangeEvent ? changes.data : changes;

      if (Array.isArray(changesData)) {
        changesData = changesData.filter(Boolean);
      }

      if (
        !allowNull &&
        typeof changesData !== 'boolean' &&
        typeof changesData !== 'number' &&
        (!changesData || (typeof changesData === 'object' && Object.keys(changesData) === 0))
      ) {
        changesData = undefined;
      }

      if (changesData === undefined) {
        objectPath.del(task.document.data, dataPath);
      } else {
        objectPath.set(task.document.data, dataPath, changesData);
      }

      const parentPath = path.slice(0, path.length - 1);
      const parentData = objectPath.get(task.document.data, parentPath);

      let { data } = task.document;

      const taskSchema = documentTemplate?.actual[task?.taskTemplateId];

      data = handleTriggers(
        task.document.data,
        triggers,
        dataPath,
        changesData,
        task.document.data[path[0]],
        task.document.data,
        parentData,
        info,
        taskSchema,
        task?.activityLog
      );

      if (!diff(state.actual[taskId].document.data, data)) {
        return state;
      }

      const newState = {
        ...state,
        actual: {
          ...state.actual,
          [taskId]: {
            ...task,
            document: {
              ...task.document,
              data: JSON.parse(JSON.stringify(data))
            }
          }
        }
      };

      if (updateOrigin) {
        if (onlyThisValue) {
          objectPath.set(newState.origin[taskId].document.data, dataPath, changesData);
          newState.origin = {
            ...state.origin,
            [taskId]: newState.origin[taskId]
          };
        } else {
          newState.origin = {
            ...state.origin,
            [taskId]: newState.actual[taskId]
          };
        }
      }

      if (!newState.origin[taskId].document.data[path[0]]) {
        newState.origin[taskId].document.data = {
          ...newState.origin[taskId].document.data,
          [path[0]]: {}
        };
      }

      return newState;
    }
    case HANDLE_SILENT_TRIGGERS: {
      const { taskId, data } = action.payload;

      const task = state.actual[taskId];

      return {
        ...state,
        actual: {
          ...state.actual,
          [taskId]: {
            ...task,
            document: {
              ...task.document,
              data
            }
          }
        }
      };
    }
    case LOAD_TASK_DOCUMENT_SUCCESS: {
      return {
        ...state,
        documents: {
          ...state.documents,
          [action.payload.id]: action.payload
        }
      };
    }
    case PREPARE_DOCUMENT_SUCCESS: {
      const taskId = Object.values(state.actual).find(
        ({ documentId }) => documentId === action.payload.id
      ).id;

      return {
        ...state,
        actual: {
          ...state.actual,
          [taskId]: {
            ...state.actual[taskId],
            document: action.payload
          }
        },
        origin: {
          ...state.origin,
          [taskId]: {
            ...state.origin[taskId],
            document: action.payload
          }
        }
      };
    }
    case CHECK_DATA_EXTERNAL_READER_SUCCESS: {
      if (action.payload?.requestId || action?.request?.requestId) return state;
      const taskId = Object.values(state.actual).find(
        ({ documentId }) => documentId === action.payload.id
      ).id;

      return {
        ...state,
        origin: {
          ...state.origin,
          [taskId]: {
            ...state.origin[taskId],
            document: action.payload
          }
        }
      };
    }
    case STORE_TASK_DOCUMENT_SUCCESS: {
      const { updateLogs } = action.payload;
      let lastUpdateLogId = null;
      let originTask = null;
      let doc = null;

      if (updateLogs) {
        const { document } = action.payload;
        const { id, documentId, changes } = (updateLogs || [])[0];

        lastUpdateLogId = id;
        originTask = Object.values(state.origin).find((item) => item?.documentId === documentId);
        doc = Object.values(state.origin).find((item) => item?.documentId === documentId)?.document;

        if (!document) {
          (changes || []).forEach(({ path, value }) => {
            objectPath.set(doc.data, path, value);

            const pathSegments = path.split('.');
            const lastIndex = pathSegments.length - 1;
            const parentPath = pathSegments.slice(0, lastIndex).join('.');
            const parentValue = objectPath.get(doc.data, parentPath);

            if (value === undefined && Array.isArray(parentValue)) {
              objectPath.set(doc.data, parentPath, parentValue);
            }
          });

          state.origin[originTask.id].lastUpdateLogId = lastUpdateLogId;
          return state;
        } else {
          doc = document;
        }
      } else {
        originTask = Object.values(state.origin).find(
          ({ documentId }) => documentId === action.payload.id
        );
        // if (useUpdateTaskReducer) {
        const actualTask = Object.values(state.actual).find(
          ({ documentId }) => documentId === action.payload.id
        );
        const properties = getDeltaProperties(actualTask.document.data, originTask.document.data);

        const newActualTask = {
          ...originTask,
          document: JSON.parse(JSON.stringify(action.payload))
        };

        properties.forEach(({ path, value }) => {
          const prevValue = objectPath.get(newActualTask.document.data, path);

          if (value && prevValue !== value) {
            objectPath.set(newActualTask.document.data, path, value);
          }
        });

        state.actual[actualTask.id] = newActualTask;
        // }

        doc = action.payload;
      }

      return {
        ...state,
        origin: {
          ...state.origin,
          [originTask?.id]: {
            ...originTask,
            lastUpdateLogId,
            document: JSON.parse(JSON.stringify(doc))
          }
        }
      };
    }
    case DELETE_TASK_DOCUMENT: {
      const { taskId } = action.payload;

      delete state.actual[taskId];
      delete state.origin[taskId];

      return {
        ...state,
        actual: {
          ...state.actual
        },
        origin: {
          ...state.origin
        }
      };
    }
    case TOGGLE_CREATE_TASK_DIALOG:
      return { ...state, showCreateDialog: !state.showCreateDialog };
    case GET_DOCUMENT_WORKFLOW_FILES_SUCCESS: {
      const regex = new RegExp('documents/(.+)/workflow_files');
      const matches = action.url.match(regex);
      return {
        ...state,
        workflowFiles: { [matches[1]]: action.payload },
        loading: false
      };
    }
    case SIGN_DOCUMENT_SUCCESS: {
      const { task: documentTask, ...document } = action.payload;
      const task = { ...documentTask, document };
      const newTask = { ...state.actual[task.id], ...task };

      return {
        ...state,
        actual: { ...state.actual, [task.id]: newTask },
        origin: {
          ...state.origin,
          [task.id]: JSON.parse(JSON.stringify(newTask))
        }
      };
    }
    case REJECT_DOOCUMENT_SIGNING_SUCCESS: {
      const { documentId } = action.payload;

      const task = Object.values(state.origin).find((origin) => origin.documentId === documentId);

      task.document.signatureRejections.push(action.payload);

      return {
        ...state,
        actual: { ...state.actual, [task.id]: task },
        origin: {
          ...state.origin,
          [task.id]: JSON.parse(JSON.stringify(task))
        }
      };
    }
    case DELETE_SIGNATURES_SUCCESS: {
      const { document } = action.payload;

      const task = Object.values(state.origin).find((origin) => origin.documentId === document.id);

      task.document.signatureRejections = [];
      task.document.signatures = [];

      return {
        ...state,
        actual: { ...state.actual, [task.id]: task },
        origin: {
          ...state.origin,
          [task.id]: JSON.parse(JSON.stringify(task))
        }
      };
    }
    case SET_TASK_DUE_DATE_SUCCESS: {
      const { id, dueDate } = action.payload;
      const task = state.actual[id];

      return {
        ...state,
        actual: {
          ...state.actual,
          [id]: {
            ...task,
            dueDate
          }
        },
        origin: {
          ...state.origin,
          [id]: {
            ...task,
            dueDate
          }
        }
      };
    }
    case GET_MY_UNREAD_TASK_COUNT_SUCCESS:
      return { ...state, unreadMyCount: action.payload.unreadTasksCount };
    case GET_UNIT_UNREAD_TASK_COUNT_SUCCESS:
      return { ...state, unreadUnitCount: action.payload.unreadTasksCount };
    case CALCULATE_FIELDS_SUCCESS: {
      const { taskId } = action.request;
      const task = state.actual[taskId];
      return {
        ...state,
        actual: {
          ...state.actual,
          [taskId]: {
            ...task,
            document: action.payload
          }
        },
        origin: {
          ...state.origin,
          [taskId]: {
            ...task,
            document: JSON.parse(JSON.stringify(action.payload))
          }
        }
      };
    }
    case REQUEST_REGISTER_KEY_RECORDS_FILTER_SUCCESS: {
      const {
        meta: { updated }
      } = action.payload;

      if (!updated) {
        return state;
      }

      const { path, value } = updated;
      const {
        options: { control }
      } = action.request;
      const [, documentId] = control.split('.');

      const actualTask = Object.values(state.actual).find(
        ({ documentId: id }) => documentId === id
      );
      const originTask = Object.values(state.origin).find(
        ({ documentId: id }) => documentId === id
      );

      const actualTaskDocumentData = actualTask.document.data;
      const originTaskDocumentData = originTask.document.data;

      const existedValue = objectPath.get(actualTaskDocumentData, path);
      if (_.equals(existedValue, value)) {
        return state;
      }

      objectPath.set(actualTaskDocumentData, path, value);
      objectPath.set(originTaskDocumentData, path, value);

      return {
        ...state,
        actual: {
          ...state.actual,
          [actualTask.id]: {
            ...actualTask,
            document: {
              ...actualTask.document,
              data: { ...actualTaskDocumentData }
            }
          }
        },
        origin: {
          ...state.origin,
          [originTask.id]: {
            ...originTask,
            document: {
              ...originTask.document,
              data: { ...originTaskDocumentData }
            }
          }
        }
      };
    }
    case SET_ERROR_TASK_SIGNERS:
      const { taskId, step } = action.payload;

      return {
        ...state,
        actual: {
          ...state.actual,
          [taskId]: {
            ...state.actual[taskId],
            errorTaskSigners: step
          }
        }
      };

    default:
      return state;
  }
};

export default rootReducer;
