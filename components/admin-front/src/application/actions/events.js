import * as api from 'services/api';
import * as Sentry from '@sentry/browser';
import store from 'store';

import { addError } from 'actions/error';

const REQUEST_EVENT = 'EVENTS/REQUEST_EVENT';
const DELETE_EVENT = 'EVENTS/DELETE_EVENT';
const SAVE_EVENT_DATA = 'EVENTS/SAVE_EVENT_DATA';

const CHANGE_EVENT_DATA = 'EVENTS/CHANGE_EVENT_DATA';

const GET_EVENT_TYPES = 'EVENTS/GET_EVENT_TYPES';
const UNDO_EVENT_DATA = 'UNDO_EVENT_DATA';

const entityToBody = ({ jsonSchema, ...event }) => {
  try {
    event.jsonSchema = JSON.parse(jsonSchema || '{}');
    event.description = event.description || '';
    event.htmlTemplate = event.htmlTemplate || '';
  } catch (e) {
    // nothing to do;
  }

  return event;
};

export const requestEvent = (eventId) => (dispatch) =>
  api
    .get(`events/${eventId}`, REQUEST_EVENT, dispatch, { eventId })
    .catch((error) => {
      // dispatch(addError(new Error('FailFetchingEvent')));
      // Sentry.captureException(error);
      return error;
    });

export const deleteEvent = (eventId) => (dispatch) =>
  api
    .del(`events/${eventId}`, {}, DELETE_EVENT, dispatch, { eventId })
    .catch((error) => {
      dispatch(addError(new Error('FailDeletingEvent')));
      Sentry.captureException(error);
      return error;
    });

export const saveEventData = (data) => (dispatch) => {
  const {
    workflow: { versions },
  } = store.getState();

  const eventList = [].concat(data).map(entityToBody);
  const { workflowTemplateId } = eventList[0] || {};

  return api
    .post(
      'events',
      eventList,
      SAVE_EVENT_DATA,
      dispatch,
      { data: eventList, workflowTemplateId },
      {
        headers: { 'Last-Workflow-History-Id': versions[workflowTemplateId] },
      },
    )
    .catch((error) => {
      // dispatch(addError(new Error('FailSavingEvent')));
      Sentry.captureException(error);
      return error;
    });
};

export const getEventTypes = () => (dispatch) =>
  api.get('event-types', GET_EVENT_TYPES, dispatch).catch((error) => {
    // dispatch(addError(new Error('FailSavingEvent')));
    Sentry.captureException(error);
    return error;
  });

export const changeEventData = (eventId, data) => ({
  type: CHANGE_EVENT_DATA,
  payload: { eventId, data },
});

export const undoEventData = (eventId) => ({
  type: UNDO_EVENT_DATA,
  payload: { eventId },
});
