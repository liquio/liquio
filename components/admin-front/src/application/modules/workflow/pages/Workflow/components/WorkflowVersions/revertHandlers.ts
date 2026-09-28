import store from 'store';

import { storeWorkflowData } from 'application/actions/workflow';

import { saveTaskData, deleteTask } from 'application/actions/tasks';
import { saveEventData, deleteEvent } from 'application/actions/events';
import { saveGatewayData, deleteGateway } from 'application/actions/gateways';

interface Change {
  id?: string | number;
  revert?: Record<string, unknown>;
  type: string;
}

type SaveHandler = (data: never) => (dispatch: never) => Promise<unknown>;
type DeleteHandler = (id: string | number) => (dispatch: never) => Promise<unknown>;

const revertHandler = (saveHandler: SaveHandler, deleteHandler?: DeleteHandler) => (change: Change) => async () => {
  const { id, revert } = change;

  if (!revert) {
    deleteHandler && (await deleteHandler(id as string | number)(store.dispatch as never));
  } else {
    const result = await saveHandler(revert as never)(store.dispatch as never);
    if (result instanceof Error) {
      throw result;
    }
  }

  return change;
};

const handlers: Record<string, (change: Change) => () => Promise<unknown>> = {
  workflow: revertHandler(
    (({ id, ...workflow }: { id: string | number; [key: string]: unknown }) =>
      (dispatch: never) =>
        storeWorkflowData(id, workflow)(dispatch)) as unknown as SaveHandler,
  ),
  task: revertHandler(saveTaskData as unknown as SaveHandler, deleteTask),
  event: revertHandler(saveEventData as unknown as SaveHandler, deleteEvent),
  gateway: revertHandler(saveGatewayData as unknown as SaveHandler, deleteGateway),
};

export default (change: Change) => handlers[change.type](change);
