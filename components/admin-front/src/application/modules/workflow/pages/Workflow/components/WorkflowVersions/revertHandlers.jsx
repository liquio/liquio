import store from 'store';

import { storeWorkflowData } from 'application/actions/workflow';

import { saveTaskData, deleteTask } from 'application/actions/tasks';
import { saveEventData, deleteEvent } from 'application/actions/events';
import { saveGatewayData, deleteGateway } from 'application/actions/gateways';

const revertHandler = (saveHandler, deleteHandler) => (change) => async () => {
  const { id, revert } = change;

  if (!revert) {
    deleteHandler && (await deleteHandler(id)(store.dispatch));
  } else {
    const result = await saveHandler(revert)(store.dispatch);
    if (result instanceof Error) {
      throw result;
    }
  }

  return change;
};

const handlers = {
  workflow: revertHandler(
    ({ id, ...workflow }) =>
      (dispatch) =>
        storeWorkflowData(id, workflow)(dispatch),
  ),
  task: revertHandler(saveTaskData, deleteTask),
  event: revertHandler(saveEventData, deleteEvent),
  gateway: revertHandler(saveGatewayData, deleteGateway),
};

export default (change) => handlers[change.type](change);
