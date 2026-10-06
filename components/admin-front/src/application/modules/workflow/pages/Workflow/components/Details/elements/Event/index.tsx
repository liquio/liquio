import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import PreloaderRaw from 'components/Preloader';
import { SchemaForm, handleChangeAdapter } from 'components/JsonSchema';
import emptyEvent from 'application/modules/workflow/variables/emptyEvent';
import eventElementTypes from 'application/modules/workflow/variables/eventElementTypes';
import {
  requestEvent,
  changeEventData,
  saveEventData,
  getEventTypes,
} from 'application/actions/events';
import minUnusedIndex from 'helpers/minUnusedIndex';
import padWithZeroes from 'helpers/padWithZeroes';
import processList from 'services/processList';
import schema from './schema';
import checkAccess from 'helpers/checkAccess';

const Preloader = PreloaderRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface EventType {
  id?: string | number;
  name?: string;
  [key: string]: unknown;
}

interface BpmnBusinessObject {
  id: string;
  name?: string;
  [key: string]: unknown;
}

interface BpmnElement {
  id: string;
  businessObject: BpmnBusinessObject;
}

interface ElementRegistryEntry {
  type: string;
  id: string;
  businessObject: BpmnBusinessObject;
}

interface ElementRegistry {
  getAll(): ElementRegistryEntry[];
}

interface EventEntity {
  id?: string | number;
  [key: string]: unknown;
}

interface EventElementProps {
  actualEventList: Record<string, EventEntity>;
  eventTypes?: EventType[] | null;
  handleSave?: boolean;
  selectionId?: string | null;
  userInfo: Record<string, unknown>;
  userUnits: unknown[];
  t: (key: string) => string;
  element: BpmnElement;
  workflow: { id?: string | number };
  actions: {
    requestEvent: (eventId: number) => Promise<EventEntity | Error>;
    saveEventData: (data: unknown) => Promise<unknown>;
    changeEventData: (eventId: number, data: unknown) => unknown;
    getEventTypes: () => Promise<EventType[]>;
  };
  onChange: (businessObject: BpmnBusinessObject) => void;
  modeler?: BpmnJsInstance | null;
}

const EventElement = (props: EventElementProps) => {
  const {
    actualEventList,
    eventTypes,
    handleSave,
    selectionId,
    userInfo,
    userUnits,
  } = props;
  const { t, element, workflow, actions, onChange, eventTypes: types } = props;
  const { modeler } = props;

  const isLocalId = (id: string) =>
    eventElementTypes.some((type) => {
      const suffix = type.split(':').pop() as string;
      return id.indexOf(suffix) === 0;
    });

  const getEventId = ({ businessObject: { id } }: { businessObject: { id: string } }) =>
    parseInt(id.split('-').pop() as string, 10);

  const handleChange = async (event: unknown) =>
    await actions.changeEventData(getEventId(element), event);

  React.useEffect(() => {
    const getNextEventId = (element: BpmnElement) => {
      const ids = (modeler?.get('elementRegistry') as ElementRegistry)
        .getAll()
        .filter(
          ({ type, id }) =>
            eventElementTypes.includes(type) &&
            id !== element.businessObject.id,
        )
        .filter(({ businessObject: { id } }) => !isLocalId(id))
        .map(getEventId as never)
        .map(String)
        .map((id: string) => id.replace(workflow.id as string, ''))
        .map((id) => parseInt(id, 10));

      return workflow.id + padWithZeroes(minUnusedIndex(ids, 1), 3);
    };

    const loadEvent = async () => {
      const eventTypes =
        types ||
        (await processList.hasOrSet('getEventTypes', actions.getEventTypes));

      const eventId = getEventId(element);

      if (isLocalId(element.businessObject.id)) {
        const nextEventId = getNextEventId(element);
        element.businessObject.id = ['event', nextEventId].join('-');
        element.businessObject.name =
          element.businessObject.name || t('NewEvent');
        onChange(element.businessObject);
        return;
      }

      if (
        !actualEventList[eventId] &&
        !processList.has('requestEvent', eventId)
      ) {
        const event = await processList.set(
          'requestEvent',
          actions.requestEvent as never,
          eventId,
        );
        if (event instanceof Error && event.message === '404 not found') {
          await actions.saveEventData(
            emptyEvent(eventId, { t, eventTypes: eventTypes as EventType[], workflow: workflow as { id: string | number } }),
          );
        }
      }
    };

    loadEvent();
  }, [
    selectionId,
    actions,
    actualEventList,
    element,
    modeler,
    onChange,
    t,
    types,
    workflow,
  ]);

  const eventId = getEventId(element);

  const eventTypesTranslated = (eventTypes || []).map((e) => ({
    ...e,
    stringified: t(e?.name as string),
  }));

  const event = actualEventList[eventId];

  const isEditable = checkAccess(
    { userHasUnit: [1000002] },
    userInfo,
    userUnits as never,
  );

  if (!event) return <Preloader />;

  return (
    <SchemaForm
      schema={schema({
        eventTypes: eventTypesTranslated,
        t
      })}
      value={event}
      readOnly={!isEditable}
      onChange={handleChangeAdapter(event, handleChange)}
      handleSave={handleSave}
    />
  );
};

interface EventElementState {
  events: { actual: Record<string, EventEntity>; types: EventType[] };
  auth: { info: Record<string, unknown>; userUnits: unknown[] };
}

const mapStateToProps = ({
  events: { actual, types },
  auth: { info: userInfo, userUnits },
}: EventElementState) => ({
  actualEventList: actual,
  eventTypes: types,
  userInfo,
  userUnits,
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    requestEvent: bindActionCreators(requestEvent, dispatch),
    saveEventData: bindActionCreators(saveEventData, dispatch),
    changeEventData: bindActionCreators(changeEventData, dispatch),
    getEventTypes: bindActionCreators(getEventTypes, dispatch),
  },
});

const translated = translate('WorkflowAdminPage')(EventElement as never);
export default connect(mapStateToProps, mapDispatchToProps)(translated as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
