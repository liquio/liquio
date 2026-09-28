import * as api from 'services/api';
import * as Sentry from '@sentry/browser';
import store from 'store';

import { addError } from 'actions/error';

type Dispatch = (action: unknown) => unknown;

const REQUEST_EVENT = 'EVENTS/REQUEST_EVENT';
const DELETE_EVENT = 'EVENTS/DELETE_EVENT';
const SAVE_EVENT_DATA = 'EVENTS/SAVE_EVENT_DATA';

const CHANGE_EVENT_DATA = 'EVENTS/CHANGE_EVENT_DATA';

const GET_EVENT_TYPES = 'EVENTS/GET_EVENT_TYPES';
const UNDO_EVENT_DATA = 'UNDO_EVENT_DATA';

interface EventEntity {
  jsonSchema?: string;
  description?: string;
  htmlTemplate?: string;
  workflowTemplateId?: string | number;
  [key: string]: unknown;
}

const entityToBody = ({ jsonSchema, ...event }: EventEntity) => {
  try {
    event.jsonSchema = JSON.parse(jsonSchema || '{}');
    event.description = event.description || '';
    event.htmlTemplate = event.htmlTemplate || '';
  } catch {
    // nothing to do;
  }

  return event;
};

export const requestEvent = (eventId: string | number) => (dispatch: Dispatch) =>
  api
    .get(`events/${eventId}`, REQUEST_EVENT, dispatch, { eventId })
    .catch((error) => {
      // dispatch(addError(new Error('FailFetchingEvent')));
      // Sentry.captureException(error);
      return error;
    });

export const deleteEvent = (eventId: string | number) => (dispatch: Dispatch) =>
  api
    .del(`events/${eventId}`, {}, DELETE_EVENT, dispatch, { eventId })
    .catch((error) => {
      dispatch(addError(new Error('FailDeletingEvent')));
      Sentry.captureException(error);
      return error;
    });

export const saveEventData = (data: EventEntity | EventEntity[]) => (dispatch: Dispatch) => {
  const {
    workflow: { versions },
  } = store.getState();

  const eventList = ([] as EventEntity[]).concat(data).map(entityToBody);
  const { workflowTemplateId } = eventList[0] || {};

  return api
    .post(
      'events',
      eventList,
      SAVE_EVENT_DATA,
      dispatch,
      { data: eventList, workflowTemplateId },
      {
        headers: { 'Last-Workflow-History-Id': versions[workflowTemplateId as string] as string },
      },
    )
    .catch((error) => {
      // dispatch(addError(new Error('FailSavingEvent')));
      Sentry.captureException(error);
      return error;
    });
};

export const getEventTypes = () => (dispatch: Dispatch) =>
  api.get('event-types', GET_EVENT_TYPES, dispatch).catch((error) => {
    // dispatch(addError(new Error('FailSavingEvent')));
    Sentry.captureException(error);
    return error;
  });

export const changeEventData = (eventId: string | number, data: unknown) => ({
  type: CHANGE_EVENT_DATA,
  payload: { eventId, data },
});

export const undoEventData = (eventId: string | number) => ({
  type: UNDO_EVENT_DATA,
  payload: { eventId },
});
