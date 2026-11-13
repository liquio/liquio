import taskElementTypes from 'application/modules/workflow/variables/taskElementTypes';

interface TaskEntity {
  documentTemplateEntity: { name: string; [key: string]: unknown };
  taskTemplateEntity: { id: unknown; name: string; [key: string]: unknown };
  [key: string]: unknown;
}

interface Action {
  type: string;
  payload?: unknown;
  request?: { taskId?: string | number };
}

interface TasksState {
  actual: Record<string, TaskEntity | null>;
  origin: Record<string, TaskEntity | null>;
}

const REQUEST_TASK_SUCCESS = 'TASKS/REQUEST_TASK_SUCCESS';
const REQUEST_TASK_FAIL = 'TASKS/REQUEST_TASK_FAIL';
const CHANGE_TASK_DATA = 'TASKS/CHANGE_TASK_DATA';
const SAVE_TASK_DATA_SUCCESS = 'TASKS/SAVE_TASK_DATA_SUCCESS';

const DELETE_TASK_SUCCESS = 'TASKS/DELETE_TASK_SUCCESS';

const ELEMENT_CHANGED = 'WORKFLOW/ELEMENT_CHANGED';
const UNDO_TASK_DATA = 'UNDO_TASK_DATA';

const initialState: TasksState = {
  actual: {},
  origin: {}
};

const rootReducer = (state: TasksState = initialState, action: Action): TasksState => {
  switch (action.type) {
    case REQUEST_TASK_SUCCESS: {
      const { taskId } = action.request as { taskId: string | number };
      const task = action.payload as TaskEntity;

      return {
        ...state,
        actual: {
          ...state.actual,
          [taskId]: task
        },
        origin: {
          ...state.origin,
          [taskId]: JSON.parse(JSON.stringify(task))
        }
      };
    }
    case REQUEST_TASK_FAIL: {
      const { taskId } = action.request as { taskId: string | number };
      return {
        ...state,
        actual: {
          ...state.actual,
          [taskId]: null
        },
        origin: {
          ...state.origin,
          [taskId]: null
        }
      };
    }
    case SAVE_TASK_DATA_SUCCESS: {
      const tasks = (action.payload as TaskEntity[]).reduce<Record<string, TaskEntity>>(
        (acc, taskData) => ({
          ...acc,
          [taskData.taskTemplateEntity.id as string]: taskData
        }),
        {}
      );

      return {
        ...state,
        actual: {
          ...state.actual,
          ...tasks
        },
        origin: {
          ...state.origin,
          ...JSON.parse(JSON.stringify(tasks))
        }
      };
    }
    case CHANGE_TASK_DATA: {
      const { taskId, data } = action.payload as { taskId: string | number; data: TaskEntity };
      return {
        ...state,
        actual: {
          ...state.actual,
          [taskId]: data
        }
      };
    }
    case ELEMENT_CHANGED: {
      const { type, businessObject } = action.payload as { type: string; businessObject: { name?: string; id: string } };

      if (!taskElementTypes.includes(type)) {
        return state;
      }

      const { name, id } = businessObject;
      const taskId = id.split('-').pop() as string;
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
          [taskId]: task
        }
      };
    }
    case DELETE_TASK_SUCCESS: {
      const { taskId } = action.request as { taskId: string };

      const filteredIds = Object.keys(state.actual).filter((id) => id !== taskId);
      return {
        ...state,
        actual: filteredIds.reduce<Record<string, TaskEntity | null>>((acc, id) => ({ ...acc, [id]: state.actual[id] }), {}),
        origin: filteredIds.reduce<Record<string, TaskEntity | null>>((acc, id) => ({ ...acc, [id]: state.origin[id] }), {})
      };
    }

    case UNDO_TASK_DATA: {
      const { taskId } = action.payload as { taskId: string };

      // Note: this only shallow-copies `state`, so `newState.actual` is the same object
      // reference as `state.actual` — the delete below mutates it in place. Preserved as-is.
      const newState = {
        ...state
      };

      delete newState.actual[taskId];

      return {
        ...newState
      };
    }

    default:
      return state;
  }
};
export default rootReducer;
