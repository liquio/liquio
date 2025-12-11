import * as api from 'services/api';
import * as Sentry from '@sentry/browser';
import store from 'store';

// import { addError } from 'actions/error';

const REQUEST_GATEWAY = 'GATEWAYS/REQUEST_GATEWAY';
const DELETE_GATEWAY = 'GATEWAYS/DELETE_GATEWAY';
const SAVE_GATEWAY_DATA = 'GATEWAYS/SAVE_GATEWAY_DATA';

const CHANGE_GATEWAY_DATA = 'GATEWAYS/CHANGE_GATEWAY_DATA';

const GET_GATEWAY_TYPES = 'GATEWAYS/GET_GATEWAY_TYPES';
const UNDO_GATEWAY_DATA = 'UNDO_GATEWAY_DATA';

const entityToBody = ({
  jsonSchema,
  name,
  description,
  ...gateway
}) => {
  try {
    gateway.jsonSchema = jsonSchema || {};
    gateway.name = name || '';
    gateway.description = description || '';
  } catch (e) {
    // Nothing to do;
  }

  return gateway;
};

export const requestGateway = (gatewayId) => (dispatch) =>
  api
    .get(`gateways/${gatewayId}`, REQUEST_GATEWAY, dispatch, { gatewayId })
    .catch((error) => {
      // dispatch(addError(new Error('FailFetchingGateway')));
      // Sentry.captureException(error);
      return error;
    });

export const deleteGateway = (gatewayId) => (dispatch) =>
  api
    .del(`gateways/${gatewayId}`, {}, DELETE_GATEWAY, dispatch, { gatewayId })
    .catch((error) => {
      // dispatch(addError(new Error('FailDeletingGateway')));
      Sentry.captureException(error);
      return error;
    });

export const saveGatewayData = (data) => (dispatch) => {
  const {
    workflow: { versions },
  } = store.getState();

  const gatewayList = [].concat(data).map(entityToBody);
  const { workflowTemplateId } = gatewayList[0] || {};

  return api
    .post(
      'gateways',
      [].concat(data).map(entityToBody),
      SAVE_GATEWAY_DATA,
      dispatch,
      { data: gatewayList, workflowTemplateId },
      {
        headers: { 'Last-Workflow-History-Id': versions[workflowTemplateId] },
      },
    )
    .catch((error) => {
      // dispatch(addError(new Error('FailSavingGateway')));
      Sentry.captureException(error);
      return error;
    });
};

export const getGatewayTypes = () => (dispatch) =>
  api.get('gateway-types', GET_GATEWAY_TYPES, dispatch).catch((error) => {
    // dispatch(addError(new Error('FailSavingGateway')));
    Sentry.captureException(error);
    return error;
  });

export const changeGatewayData = (gatewayId, data) => ({
  type: CHANGE_GATEWAY_DATA,
  payload: { gatewayId, data },
});

export const undoGateWayData = (gatewayId) => ({
  type: UNDO_GATEWAY_DATA,
  payload: { gatewayId },
});
