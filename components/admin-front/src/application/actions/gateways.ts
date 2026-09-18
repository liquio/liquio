import * as api from 'services/api';
import * as Sentry from '@sentry/browser';
import store from 'store';

// import { addError } from 'actions/error';

type Dispatch = (action: unknown) => unknown;

const REQUEST_GATEWAY = 'GATEWAYS/REQUEST_GATEWAY';
const DELETE_GATEWAY = 'GATEWAYS/DELETE_GATEWAY';
const SAVE_GATEWAY_DATA = 'GATEWAYS/SAVE_GATEWAY_DATA';

const CHANGE_GATEWAY_DATA = 'GATEWAYS/CHANGE_GATEWAY_DATA';

const GET_GATEWAY_TYPES = 'GATEWAYS/GET_GATEWAY_TYPES';
const UNDO_GATEWAY_DATA = 'UNDO_GATEWAY_DATA';

interface GatewayEntity {
  jsonSchema?: unknown;
  jsonSchemaRaw?: string;
  name?: string;
  description?: string;
  workflowTemplateId?: string | number;
  [key: string]: unknown;
}

const entityToBody = ({
  jsonSchema,
  name,
  description,
  ...gateway
}: GatewayEntity) => {
  try {
    gateway.jsonSchema = jsonSchema || {};
    gateway.jsonSchemaRaw = '';
    gateway.name = name || '';
    gateway.description = description || '';
  } catch {
    // Nothing to do;
  }

  return gateway;
};

export const requestGateway = (gatewayId: string | number) => (dispatch: Dispatch) =>
  api
    .get(`gateways/${gatewayId}`, REQUEST_GATEWAY, dispatch, { gatewayId })
    .catch((error) => {
      // dispatch(addError(new Error('FailFetchingGateway')));
      // Sentry.captureException(error);
      return error;
    });

export const deleteGateway = (gatewayId: string | number) => (dispatch: Dispatch) =>
  api
    .del(`gateways/${gatewayId}`, {}, DELETE_GATEWAY, dispatch, { gatewayId })
    .catch((error) => {
      // dispatch(addError(new Error('FailDeletingGateway')));
      Sentry.captureException(error);
      return error;
    });

export const saveGatewayData = (data: GatewayEntity | GatewayEntity[]) => (dispatch: Dispatch) => {
  const {
    workflow: { versions },
  } = store.getState();

  const gatewayList = ([] as GatewayEntity[]).concat(data).map(entityToBody);
  const { workflowTemplateId } = gatewayList[0] || {};

  return api
    .post(
      'gateways',
      ([] as GatewayEntity[]).concat(data).map(entityToBody),
      SAVE_GATEWAY_DATA,
      dispatch,
      { data: gatewayList, workflowTemplateId },
      {
        headers: { 'Last-Workflow-History-Id': versions[workflowTemplateId as string] as string },
      },
    )
    .catch((error) => {
      // dispatch(addError(new Error('FailSavingGateway')));
      Sentry.captureException(error);
      return error;
    });
};

export const getGatewayTypes = () => (dispatch: Dispatch) =>
  api.get('gateway-types', GET_GATEWAY_TYPES, dispatch).catch((error) => {
    // dispatch(addError(new Error('FailSavingGateway')));
    Sentry.captureException(error);
    return error;
  });

export const changeGatewayData = (gatewayId: string | number, data: unknown) => ({
  type: CHANGE_GATEWAY_DATA,
  payload: { gatewayId, data },
});

export const undoGateWayData = (gatewayId: string | number) => ({
  type: UNDO_GATEWAY_DATA,
  payload: { gatewayId },
});
