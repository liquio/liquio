import * as api from 'services/api';
import * as Sentry from '@sentry/browser';
import { addError } from 'actions/error';

type Dispatch = (action: unknown) => unknown;

const REQUEST_WORKFLOW_PROCESS_LOGS = 'REQUEST_WORKFLOW_PROCESS_LOGS';
const STOP_LOOPS = 'STOP_LOOPS';

export const requestWorkflowProcessLogs = (processId: string | number) => (dispatch: Dispatch) =>
  api
    .get(`workflow-logs/${processId}`, REQUEST_WORKFLOW_PROCESS_LOGS, dispatch)
    .catch((error) => {
      // dispatch(addError(new Error('FailFetchingWorkflowProcessLogs')));
      Sentry.captureException(error);
      return error;
    });

export const stopLoops = (processId: string | number) => (dispatch: Dispatch) =>
  api
    .post(`workflow-processes/${processId}/clear`, {}, STOP_LOOPS, dispatch)
    .catch((error) => {
      Sentry.captureException(error);
      dispatch(addError(new Error('FailStoppingLoops')));
      return error;
    });

export default { requestWorkflowProcessLogs };
