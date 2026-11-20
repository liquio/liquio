interface LogDetails {
  id?: unknown;
  finished?: boolean;
  document?: {
    task?: Record<string, unknown>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface LogEntry {
  type: string;
  details: LogDetails;
  [key: string]: unknown;
}

interface Action {
  type: string;
  payload?: { workflowId?: string | number; logs?: LogEntry[] };
  request?: { processId?: string | number; taskId?: unknown; taskData?: { finished?: boolean; document?: Record<string, unknown> } };
}

type WorkflowProcessLogsState = Record<string, LogEntry[]>;

const initialState: WorkflowProcessLogsState = {};

const REQUEST_WORKFLOW_PROCESS_LOGS_SUCCESS = 'REQUEST_WORKFLOW_PROCESS_LOGS_SUCCESS';
const UPDATE_WORKFLOW_PROCESS_TASK_SUCCESS = 'UPDATE_WORKFLOW_PROCESS_TASK_SUCCESS';

const rootReducer = (state: WorkflowProcessLogsState = initialState, action: Action): WorkflowProcessLogsState => {
  switch (action.type) {
    case REQUEST_WORKFLOW_PROCESS_LOGS_SUCCESS: {
      const { workflowId, logs } = action.payload as { workflowId: string | number; logs: LogEntry[] };

      return {
        ...state,
        [workflowId]: logs
      };
    }
    case UPDATE_WORKFLOW_PROCESS_TASK_SUCCESS: {
      const { processId, taskId, taskData } = action.request as {
        processId: string | number;
        taskId: unknown;
        taskData: { finished?: boolean; document?: Record<string, unknown> };
      };

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
                  ...log.details.document?.task,
                  finished: taskData.finished
                }
              }
            }
          };
        })
      };
    }
    default:
      return state;
  }
};
export default rootReducer;
