import objectPath from 'object-path';

const ELEMENT_SELECT = 'WORKFLOW/ELEMENT_SELECT';
const REQUEST_WORKFLOW_SUCCESS = 'WORKFLOW/REQUEST_WORKFLOW_SUCCESS';
const CHANGE_WORKFLOW_DATA = 'WORKFLOW/CHANGE_WORKFLOW_DATA';
const STORE_WORKFLOW_DATA_SUCCESS = 'WORKFLOW/STORE_WORKFLOW_DATA_SUCCESS';
const DELETE_WORKFLOW_SUCCESS = 'DELETE_WORKFLOW_SUCCESS';

const REQUEST_WORKFLOW_CATEGORIES_SUCCESS =
  'WORKFLOW/REQUEST_WORKFLOW_CATEGORIES_SUCCESS';
const CREATE_WORKFLOW_CATEGORY_SUCCESS =
  'WORKFLOW/CREATE_WORKFLOW_CATEGORY_SUCCESS';
const UPDATE_WORKFLOW_CATEGORY_SUCCESS =
  'WORKFLOW/UPDATE_WORKFLOW_CATEGORY_SUCCESS';
const DELETE_WORKFLOW_CATEGORY_SUCCESS =
  'WORKFLOW/DELETE_WORKFLOW_CATEGORY_SUCCESS';

const REQUEST_WORKFLOW_STATUSES_SUCCESS =
  'WORKFLOW/REQUEST_WORKFLOW_STATUSES_SUCCESS';

const SAVE_TASK_DATA_SUCCESS = 'TASKS/SAVE_TASK_DATA_SUCCESS';
const SAVE_EVENT_DATA_SUCCESS = 'EVENTS/SAVE_EVENT_DATA_SUCCESS';
const SAVE_GATEWAY_DATA_SUCCESS = 'GATEWAYS/SAVE_GATEWAY_DATA_SUCCESS';

const GET_WORKFLOW_VERSIONS_SUCCESS = 'GET_WORKFLOW_VERSIONS_SUCCESS';
const WORKFLOW_ELEMENT_COPIED = 'WORKFLOW_ELEMENT_COPIED';

const initialState = {
  selection: null,
  actual: {},
  origin: {},
  versions: {},
  categories: null,
  statuses: null,
  workflowVersions: null,
};

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case SAVE_TASK_DATA_SUCCESS:
    case SAVE_EVENT_DATA_SUCCESS:
    case SAVE_GATEWAY_DATA_SUCCESS: {
      const { headers } = action.payload;
      const { workflowTemplateId } = action.request;
      return {
        ...state,
        versions: {
          ...state.versions,
          [workflowTemplateId]: headers.get('Last-Workflow-History-Id'),
        },
      };
    }
    case ELEMENT_SELECT: {
      const element = action.payload;
      const { selection } = state;

      if (element && ['label'].includes(element.type)) {
        return {
          ...state,
          selection: null,
        };
      }

      if (
        element &&
        selection &&
        element.businessObject.id === selection.businessObject.id
      ) {
        return state;
      }

      return {
        ...state,
        selection: element,
      };
    }
    case STORE_WORKFLOW_DATA_SUCCESS:
    case REQUEST_WORKFLOW_SUCCESS: {
      const { id, headers } = action.payload;

      const workflow = action.payload;
      const statuses = objectPath.get(workflow, 'data.statuses') || [];
      const entryTaskTemplateIds = objectPath.get(
        workflow,
        'data.entryTaskTemplateIds',
      ) || [
        {
          name: 'Start',
          id: `() => ${workflow.id}001;`,
        },
      ];

      const workflowData = {
        ...workflow.data,
        statuses: statuses.filter(Boolean).map((status) => {
          return {
            ...status,
            label: status?.label,
          };
        }),
        entryTaskTemplateIds: entryTaskTemplateIds.map((entryTask) => {
          if (Number.isInteger(entryTask)) {
            return { name: 'start', id: `() => ${entryTask};` };
          }
          return entryTask;
        }),
      };

      return {
        ...state,
        actual: {
          ...state.actual,
          [id]: {
            ...action.payload,
            data: workflowData,
          },
        },
        origin: {
          ...state.origin,
          [id]: JSON.parse(JSON.stringify(action.payload)),
        },
        versions: {
          ...state.versions,
          [id]: headers.get('Last-Workflow-History-Id'),
        },
      };
    }
    case CHANGE_WORKFLOW_DATA: {
      const { workflowId, data } = action.payload;

      return {
        ...state,
        actual: {
          ...state.actual,
          [workflowId]: { ...state.actual[workflowId], ...data },
        },
      };
    }
    case REQUEST_WORKFLOW_STATUSES_SUCCESS: {
      return {
        ...state,
        statuses: action.payload,
      };
    }
    case REQUEST_WORKFLOW_CATEGORIES_SUCCESS: {
      return {
        ...state,
        categories: action.payload,
      };
    }
    case CREATE_WORKFLOW_CATEGORY_SUCCESS: {
      return {
        ...state,
        categories: state.categories && state.categories.concat(action.payload),
      };
    }
    case UPDATE_WORKFLOW_CATEGORY_SUCCESS: {
      const categories = state.categories
        .filter(({ id }) => id !== action.payload.id)
        .concat(action.payload);

      return {
        ...state,
        categories,
      };
    }
    case DELETE_WORKFLOW_CATEGORY_SUCCESS: {
      const { categoryId } = action.request;
      return {
        ...state,
        categories: state.categories.filter(({ id }) => id !== categoryId),
      };
    }
    case DELETE_WORKFLOW_SUCCESS: {
      const { workflowId } = action.request;

      const filteredIds = Object.keys(state.actual).filter(
        (id) => parseInt(id, 10) !== workflowId,
      );
      return {
        ...state,
        actual: filteredIds.reduce(
          (acc, id) => ({ ...acc, [id]: state.actual[id] }),
          {},
        ),
        origin: filteredIds.reduce(
          (acc, id) => ({ ...acc, [id]: state.origin[id] }),
          {},
        ),
      };
    }
    case GET_WORKFLOW_VERSIONS_SUCCESS: {
      return {
        ...state,
        workflowVersions: action.payload,
      };
    }
    case WORKFLOW_ELEMENT_COPIED: {
      return {
        ...state,
        copiedElement: action.payload,
      };
    }
    default:
      return state;
  }
};
export default rootReducer;
