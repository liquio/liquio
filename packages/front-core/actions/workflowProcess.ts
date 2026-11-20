import * as api from 'services/api';
import blobToBase64 from 'helpers/blobToBase64';

type Dispatch = (action: unknown) => unknown;

const REQUEST_WORKFLOW_PROCESS_ATTACH = 'REQUEST_WORKFLOW_PROCESS_ATTACH';

const requestWorkflowProcessAttachP7S =
  (processId: string | number, { link }: { link: string }) =>
  (dispatch: Dispatch) =>
    api
      .get(
        `workflow-processes/${processId}/files/${link}/p7s?as_file=true`,
        REQUEST_WORKFLOW_PROCESS_ATTACH,
        dispatch
      )
      .then(blobToBase64);

export { requestWorkflowProcessAttachP7S };

export default requestWorkflowProcessAttachP7S;
