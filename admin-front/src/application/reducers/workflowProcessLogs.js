const initialState = {};

const REQUEST_WORKFLOW_PROCESS_LOGS_SUCCESS =
  'REQUEST_WORKFLOW_PROCESS_LOGS_SUCCESS';
const UPDATE_WORKFLOW_PROCESS_TASK_SUCCESS =
  'UPDATE_WORKFLOW_PROCESS_TASK_SUCCESS';

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case REQUEST_WORKFLOW_PROCESS_LOGS_SUCCESS: {
      const { workflowId, logs } = action.payload;

      return {
        ...state,
        [workflowId]: logs,
      };
    }
    case UPDATE_WORKFLOW_PROCESS_TASK_SUCCESS: {
      const { processId, taskId, taskData } = action.request;

      return {
        ...state,
        [processId]: state[processId].map((log) => {
          if (log.type !== 'task' || log.details.id !== taskId) {
            return log;
          }

          return {
            ...log,
            details: {
              ...log.details,
              finished: taskData.finished,
              document: {
                ...log.details.document,
                ...taskData.document,
                task: {
                  ...log.details.document.task,
                  finished: taskData.finished,
                },
              },
            },
          };
        }),
      };
    }
    default:
      return state;
  }
};
export default rootReducer;
