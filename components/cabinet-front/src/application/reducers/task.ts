import objectPath from 'object-path';
import _ from 'lodash/fp';
import diff from 'deep-diff';

import { ChangeEvent, handleTriggers } from 'components/JsonSchema';

import getDeltaProperties from 'helpers/getDeltaProperties';

interface TaskDocument {
  id?: string | number;
  data: Record<string, unknown>;
  signatureRejections?: unknown[];
  signatures?: unknown[];
  [key: string]: unknown;
}

interface Task {
  id: string | number;
  documentId?: string | number;
  taskTemplateId?: string | number;
  document?: TaskDocument;
  activityLog?: unknown;
  lastUpdateLogId?: unknown;
  errorTaskSigners?: unknown;
  dueDate?: unknown;
  meta?: unknown;
  performerUsers?: unknown;
  performerUserNames?: unknown;
  [key: string]: unknown;
}

interface TaskState {
  showCreateDialog: boolean;
  errors: unknown[];
  loading: boolean;
  actual: Record<string, Task>;
  screens: Record<string, unknown>;
  steps: Record<string, unknown>;
  documents: Record<string, unknown>;
  workflowFiles: Record<string, unknown>;
  origin: Record<string, Task>;
  unreadMyCount: number;
  unreadUnitCount: number;
}

interface TaskAction {
  type: string;
  payload?: unknown;
  request?: unknown;
  url?: string;
  [key: string]: unknown;
}

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

const initialState: TaskState = {
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

const rootReducer = (state: TaskState = initialState, action: TaskAction): TaskState => {
  switch (action.type) {
    case UPDATE_TASK_ASSIGN_SUCCESS: {
      const { id: taskId, performerUsers, performerUserNames } = action.payload as {
        id: string | number;
        performerUsers: unknown;
        performerUserNames: unknown;
      };
      const task: Task = {
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
      const { taskId, screen } = action.payload as { taskId: string | number; screen: unknown };
      return {
        ...state,
        screens: {
          ...state.screens,
          [taskId]: screen
        }
      };
    }
    case CLEAR_TASK_STEP_AND_SCREEN: {
      const { taskId } = action.payload as { taskId: string | number };

      return {
        ...state,
        screens: Object.keys(state.screens)
          .filter((id) => id !== String(taskId))
          .reduce(
            (acc, id) => ({
              ...acc,
              [id]: state.screens[id]
            }),
            {} as Record<string, unknown>
          ),
        steps: Object.keys(state.steps)
          .filter((id) => id !== String(taskId))
          .reduce(
            (acc, id) => ({
              ...acc,
              [id]: state.steps[id]
            }),
            {} as Record<string, unknown>
          )
      };
    }
    case SET_TASK_STEP: {
      const { taskId, step } = action.payload as { taskId: string | number; step: unknown };
      return {
        ...state,
        steps: {
          ...state.steps,
          [taskId]: step
        }
      };
    }
    case UPDATE_TASK_META_DATA_SUCCESS: {
      const { id: taskId, meta } = action.payload as { id: string | number; meta: unknown };

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
      const task = action.payload as Task;
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
      const document = action.payload as { id: string | number; data: unknown };

      const task = Object.values(state.origin).find(
        ({ documentId }) => documentId === document.id
      ) as Task;

      // Note: this mutates the found `origin` entry in place before it is cloned below —
      // preserved as-is.
      (task.document as TaskDocument).data = document.data as Record<string, unknown>;

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
      const payload = action.payload as Task;
      const { id: taskId } = payload;
      const { document } = state.actual[taskId];
      const task: Task = { ...payload, document };
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
      const { taskId, data } = action.payload as { taskId: string | number; data: unknown };
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
            } as TaskDocument
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
      } = action.payload as {
        taskId: string | number;
        diffs: Array<{ path?: unknown; index?: unknown; rhs?: unknown; item?: { rhs?: unknown } }>;
        path: (string | number)[];
        options: { triggers: unknown; info: unknown };
      };
      const task = state.actual[taskId];
      let documentData = (task.document as TaskDocument).data;

      if (!diffs) {
        return state;
      }

      diffs.forEach((documentDiff) => {
        let changedObject = objectPath.get(documentData, path as string[]);
        const changes = documentDiff.rhs ?? documentDiff?.item?.rhs;

        try {
          changedObject = JSON.parse(JSON.stringify(changedObject));
        } catch {
          changedObject = [];
        }

        diff.applyChange(changedObject, true, documentDiff as never);
        // objectPath.set(changedObject, documentDiff.path || documentDiff.index, changes);
        objectPath.set(documentData, path as string[], changedObject);

        const fullPath = path
          .concat(documentDiff.path as string | number)
          .filter((item) => item !== undefined);
        const dataPath = fullPath.join('.');
        const parentPath = path.slice(0, path.length - 1);
        const parentData = objectPath.get(documentData, parentPath as string[]);

        documentData = handleTriggers(
          documentData,
          triggers as Parameters<typeof handleTriggers>[1],
          dataPath,
          changes,
          (documentData as Record<string, unknown>)[fullPath[0]],
          documentData,
          parentData,
          info
        );
      });

      const parentPath = path.slice(0, path.length - 1);
      const parentData = objectPath.get(documentData, parentPath as string[]);
      const changesData = objectPath.get(documentData, path as string[]);

      documentData = handleTriggers(
        documentData,
        triggers as Parameters<typeof handleTriggers>[1],
        path.join('.'),
        changesData,
        (documentData as Record<string, unknown>)[path[0]],
        documentData,
        parentData,
        info
      );

      if (!diff((task.document as TaskDocument).data, documentData)) {
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
            } as TaskDocument
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
      } = action.payload as {
        taskId: string | number;
        path: (string | number)[];
        changes: unknown;
        triggers: unknown;
        schema: { allowNull?: boolean };
        info: unknown;
        documentTemplate?: { actual?: Record<string, unknown> };
        updateOrigin?: boolean;
        onlyThisValue?: boolean;
      };
      let task: Task;

      try {
        task = JSON.parse(JSON.stringify(state.actual[taskId]));
      } catch {
        return state;
      }

      const dataPath = path.join('.');

      let changesData: unknown = changes instanceof ChangeEvent ? changes.data : changes;

      if (Array.isArray(changesData)) {
        changesData = changesData.filter(Boolean);
      }

      if (
        !allowNull &&
        typeof changesData !== 'boolean' &&
        typeof changesData !== 'number' &&
        (!changesData || (typeof changesData === 'object' && Object.keys(changesData).length === 0))
      ) {
        changesData = undefined;
      }

      const taskDocument = task.document as TaskDocument;

      if (changesData === undefined) {
        objectPath.del(taskDocument.data, dataPath);
      } else {
        objectPath.set(taskDocument.data, dataPath, changesData);
      }

      const parentPath = path.slice(0, path.length - 1);
      const parentData = objectPath.get(taskDocument.data, parentPath as string[]);

      let { data } = taskDocument;

      const taskSchema = documentTemplate?.actual?.[task?.taskTemplateId as string];

      data = handleTriggers(
        taskDocument.data,
        triggers as Parameters<typeof handleTriggers>[1],
        dataPath,
        changesData,
        taskDocument.data[path[0]],
        taskDocument.data,
        parentData,
        info,
        taskSchema as Parameters<typeof handleTriggers>[8],
        task?.activityLog
      );

      if (!diff((state.actual[taskId].document as TaskDocument).data, data)) {
        return state;
      }

      const newState: TaskState = {
        ...state,
        actual: {
          ...state.actual,
          [taskId]: {
            ...task,
            document: {
              ...taskDocument,
              data: JSON.parse(JSON.stringify(data))
            }
          }
        }
      };

      if (updateOrigin) {
        if (onlyThisValue) {
          objectPath.set(
            (newState.origin[taskId].document as TaskDocument).data,
            dataPath,
            changesData
          );
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

      if (!(newState.origin[taskId].document as TaskDocument).data[path[0]]) {
        (newState.origin[taskId].document as TaskDocument).data = {
          ...(newState.origin[taskId].document as TaskDocument).data,
          [path[0]]: {}
        };
      }

      return newState;
    }
    case HANDLE_SILENT_TRIGGERS: {
      const { taskId, data } = action.payload as { taskId: string | number; data: unknown };

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
            } as TaskDocument
          }
        }
      };
    }
    case LOAD_TASK_DOCUMENT_SUCCESS: {
      const payload = action.payload as { id: string | number };
      return {
        ...state,
        documents: {
          ...state.documents,
          [payload.id]: payload
        }
      };
    }
    case PREPARE_DOCUMENT_SUCCESS: {
      const payload = action.payload as { id: string | number };
      const taskId = (
        Object.values(state.actual).find(({ documentId }) => documentId === payload.id) as Task
      ).id;

      return {
        ...state,
        actual: {
          ...state.actual,
          [taskId]: {
            ...state.actual[taskId],
            document: payload as unknown as TaskDocument
          }
        },
        origin: {
          ...state.origin,
          [taskId]: {
            ...state.origin[taskId],
            document: payload as unknown as TaskDocument
          }
        }
      };
    }
    case CHECK_DATA_EXTERNAL_READER_SUCCESS: {
      const payload = action.payload as { requestId?: unknown; id: string | number };
      const request = action.request as { requestId?: unknown } | undefined;
      if (payload?.requestId || request?.requestId) return state;
      const taskId = (
        Object.values(state.actual).find(({ documentId }) => documentId === payload.id) as Task
      ).id;

      return {
        ...state,
        origin: {
          ...state.origin,
          [taskId]: {
            ...state.origin[taskId],
            document: payload as unknown as TaskDocument
          }
        }
      };
    }
    case STORE_TASK_DOCUMENT_SUCCESS: {
      const payload = action.payload as {
        id: string | number;
        updateLogs?: Array<{ id: unknown; documentId: unknown; changes?: Array<{ path: string; value: unknown }> }>;
        document?: unknown;
      };
      const { updateLogs } = payload;
      let lastUpdateLogId: unknown = null;
      let originTask: Task | undefined = undefined;
      let doc: TaskDocument | undefined = undefined;

      if (updateLogs) {
        const { document } = payload;
        const { id, documentId, changes } = (updateLogs || [])[0];

        lastUpdateLogId = id;
        originTask = Object.values(state.origin).find(
          (item) => item?.documentId === documentId
        );
        doc = Object.values(state.origin).find((item) => item?.documentId === documentId)
          ?.document;

        if (!document) {
          (changes || []).forEach(({ path, value }) => {
            objectPath.set(doc?.data, path, value);

            const pathSegments = path.split('.');
            const lastIndex = pathSegments.length - 1;
            const parentPath = pathSegments.slice(0, lastIndex).join('.');
            const parentValue = objectPath.get(doc?.data, parentPath);

            if (value === undefined && Array.isArray(parentValue)) {
              objectPath.set(doc?.data, parentPath, parentValue);
            }
          });

          // Note: mutates state.origin[originTask.id] directly and returns the same
          // `state` reference (no new object) — preserved as-is.
          (state.origin[(originTask as Task).id] as Task).lastUpdateLogId = lastUpdateLogId;
          return state;
        } else {
          doc = document as TaskDocument;
        }
      } else {
        originTask = Object.values(state.origin).find(
          ({ documentId }) => documentId === payload.id
        );
        // if (useUpdateTaskReducer) {
        const actualTask = Object.values(state.actual).find(
          ({ documentId }) => documentId === payload.id
        ) as Task;
        const properties = getDeltaProperties(
          (actualTask.document as TaskDocument).data,
          (originTask as Task).document?.data
        );

        const newActualTask: Task = {
          ...(originTask as Task),
          document: JSON.parse(JSON.stringify(payload))
        };

        properties.forEach(({ path, value }) => {
          const prevValue = objectPath.get((newActualTask.document as TaskDocument).data, path);

          if (value && prevValue !== value) {
            objectPath.set((newActualTask.document as TaskDocument).data, path, value);
          }
        });

        // Note: mutates state.actual in place — preserved as-is.
        state.actual[actualTask.id] = newActualTask;
        // }

        doc = payload as unknown as TaskDocument;
      }

      return {
        ...state,
        origin: {
          ...state.origin,
          [(originTask as Task)?.id]: {
            ...(originTask as Task),
            lastUpdateLogId,
            document: JSON.parse(JSON.stringify(doc))
          }
        }
      };
    }
    case DELETE_TASK_DOCUMENT: {
      const { taskId } = action.payload as { taskId: string | number };

      // Note: this mutates `state.actual`/`state.origin` in place before the shallow
      // copies below are made, so the previous state's dicts lose the key too —
      // preserved as-is.
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
      const matches = (action.url as string).match(regex) as RegExpMatchArray;
      return {
        ...state,
        workflowFiles: { [matches[1]]: action.payload },
        loading: false
      };
    }
    case SIGN_DOCUMENT_SUCCESS: {
      const { task: documentTask, ...document } = action.payload as { task: Task; [key: string]: unknown };
      const task: Task = { ...documentTask, document: document as unknown as TaskDocument };
      const newTask: Task = { ...state.actual[task.id], ...task };

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
      const { documentId } = action.payload as { documentId: string | number };

      const task = Object.values(state.origin).find(
        (origin) => origin.documentId === documentId
      ) as Task;

      // Note: mutates the found `origin` entry's document array in place — preserved as-is.
      (task.document as TaskDocument).signatureRejections?.push(action.payload);

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
      const { document } = action.payload as { document: { id: string | number } };

      const task = Object.values(state.origin).find(
        (origin) => origin.documentId === document.id
      ) as Task;

      // Note: mutates the found `origin` entry directly — preserved as-is.
      (task.document as TaskDocument).signatureRejections = [];
      (task.document as TaskDocument).signatures = [];

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
      const { id, dueDate } = action.payload as { id: string | number; dueDate: unknown };
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
      return { ...state, unreadMyCount: (action.payload as { unreadTasksCount: number }).unreadTasksCount };
    case GET_UNIT_UNREAD_TASK_COUNT_SUCCESS:
      return { ...state, unreadUnitCount: (action.payload as { unreadTasksCount: number }).unreadTasksCount };
    case CALCULATE_FIELDS_SUCCESS: {
      const { taskId } = action.request as { taskId: string | number };
      const task = state.actual[taskId];
      return {
        ...state,
        actual: {
          ...state.actual,
          [taskId]: {
            ...task,
            document: action.payload as TaskDocument
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
      const payload = action.payload as { meta: { updated?: { path: string; value: unknown } } };
      const {
        meta: { updated }
      } = payload;

      if (!updated) {
        return state;
      }

      const { path, value } = updated;
      const request = action.request as { options: { control: string } };
      const {
        options: { control }
      } = request;
      const [, documentId] = control.split('.');

      const actualTask = Object.values(state.actual).find(
        ({ documentId: id }) => documentId === id
      ) as Task;
      const originTask = Object.values(state.origin).find(
        ({ documentId: id }) => documentId === id
      ) as Task;

      const actualTaskDocumentData = (actualTask.document as TaskDocument).data;
      const originTaskDocumentData = (originTask.document as TaskDocument).data;

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
            } as TaskDocument
          }
        },
        origin: {
          ...state.origin,
          [originTask.id]: {
            ...originTask,
            document: {
              ...originTask.document,
              data: { ...originTaskDocumentData }
            } as TaskDocument
          }
        }
      };
    }
    case SET_ERROR_TASK_SIGNERS: {
      const { taskId, step } = action.payload as { taskId: string | number; step: unknown };

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
    }

    default:
      return state;
  }
};

export default rootReducer;
