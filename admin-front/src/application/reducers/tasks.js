import taskElementTypes from 'application/modules/workflow/variables/taskElementTypes';

const REQUEST_TASK_SUCCESS = 'TASKS/REQUEST_TASK_SUCCESS';
const REQUEST_TASK_FAIL = 'TASKS/REQUEST_TASK_FAIL';
const CHANGE_TASK_DATA = 'TASKS/CHANGE_TASK_DATA';
const SAVE_TASK_DATA_SUCCESS = 'TASKS/SAVE_TASK_DATA_SUCCESS';

const DELETE_TASK_SUCCESS = 'TASKS/DELETE_TASK_SUCCESS';

const ELEMENT_CHANGED = 'WORKFLOW/ELEMENT_CHANGED';
const UNDO_TASK_DATA = 'UNDO_TASK_DATA';

const initialState = {
  actual: {},
  origin: {},
};

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case REQUEST_TASK_SUCCESS: {
      const { taskId } = action.request;
      const task = action.payload;

      return {
        ...state,
        actual: {
          ...state.actual,
          [taskId]: task,
        },
        origin: {
          ...state.origin,
          [taskId]: JSON.parse(JSON.stringify(task)),
        },
      };
    }
    case REQUEST_TASK_FAIL: {
      const { taskId } = action.request;
      return {
        ...state,
        actual: {
          ...state.actual,
          [taskId]: null,
        },
        origin: {
          ...state.origin,
          [taskId]: null,
        },
      };
    }
    case SAVE_TASK_DATA_SUCCESS: {
      const tasks = action.payload.reduce(
        (acc, taskData) => ({
          ...acc,
          [taskData.taskTemplateEntity.id]: taskData,
        }),
        {},
      );

      return {
        ...state,
        actual: {
          ...state.actual,
          ...tasks,
        },
        origin: {
          ...state.origin,
          ...JSON.parse(JSON.stringify(tasks)),
        },
      };
    }
    case CHANGE_TASK_DATA: {
      const { taskId, data } = action.payload;
      return {
        ...state,
        actual: {
          ...state.actual,
          [taskId]: data,
        },
      };
    }
    case ELEMENT_CHANGED: {
      const { type, businessObject } = action.payload;

      if (!taskElementTypes.includes(type)) {
        return state;
      }

      const { name, id } = businessObject;
      const taskId = id.split('-').pop();
      const task = state.actual[taskId];

      if (!task) {
        return state;
      }

      const formatedName = (name || '').slice(0, 255);

      task.documentTemplateEntity.name = formatedName;
      task.taskTemplateEntity.name = formatedName;

      return {
        ...state,
        actual: {
          ...state.actual,
          [taskId]: task,
        },
      };
    }
    case DELETE_TASK_SUCCESS: {
      const { taskId } = action.request;

      const filteredIds = Object.keys(state.actual).filter(
        (id) => id !== taskId,
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

    case UNDO_TASK_DATA: {
      const { taskId } = action.payload;

      const newState = {
        ...state,
      };

      delete newState.actual[taskId];

      return {
        ...newState,
      };
    }

    default:
      return state;
  }
};
export default rootReducer;
