import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import Preloader from 'components/Preloader';
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

const EventElement = (props) => {
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

  const isLocalId = (id) =>
    eventElementTypes.some((type) => {
      const suffix = type.split(':').pop();
      return id.indexOf(suffix) === 0;
    });

  const getEventId = ({ businessObject: { id } }) =>
    parseInt(id.split('-').pop(), 10);

  const handleChange = async (event) =>
    await actions.changeEventData(getEventId(element), event);

  React.useEffect(() => {
    const getNextEventId = (element) => {
      const ids = modeler
        .get('elementRegistry')
        .getAll()
        .filter(
          ({ type, id }) =>
            eventElementTypes.includes(type) &&
            id !== element.businessObject.id,
        )
        .filter(({ businessObject: { id } }) => !isLocalId(id))
        .map(getEventId)
        .map(String)
        .map((id) => id.replace(workflow.id, ''))
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
          actions.requestEvent,
          eventId,
        );
        if (event instanceof Error && event.message === '404 not found') {
          await actions.saveEventData(
            emptyEvent(eventId, { t, eventTypes, workflow }),
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
    stringified: t(e?.name),
  }));

  const event = actualEventList[eventId];

  const isEditable = checkAccess(
    { userHasUnit: [1000002] },
    userInfo,
    userUnits,
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

EventElement.propTypes = {
  t: PropTypes.func.isRequired,
  actions: PropTypes.object.isRequired,
  actualEventList: PropTypes.object,
  element: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  eventTypes: PropTypes.array,
  workflow: PropTypes.object,
  selectionId: PropTypes.string,
  modeler: PropTypes.object,
  handleSave: PropTypes.bool.isRequired,
};

EventElement.defaultProps = {
  actualEventList: {},
  eventTypes: null,
  workflow: {},
  selectionId: null,
  modeler: null,
};

const mapStateToProps = ({
  events: { actual, types },
  auth: { info: userInfo, userUnits },
}) => ({
  actualEventList: actual,
  eventTypes: types,
  userInfo,
  userUnits,
});

const mapDispatchToProps = (dispatch) => ({
  actions: {
    requestEvent: bindActionCreators(requestEvent, dispatch),
    saveEventData: bindActionCreators(saveEventData, dispatch),
    changeEventData: bindActionCreators(changeEventData, dispatch),
    getEventTypes: bindActionCreators(getEventTypes, dispatch),
  },
});

const translated = translate('WorkflowAdminPage')(EventElement);
export default connect(mapStateToProps, mapDispatchToProps)(translated);
