import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import minUnusedIndex from 'helpers/minUnusedIndex';

const eventElementTypes = ['bpmn:EndEvent', 'bpmn:Event'];

const EndEventElement = ({ modeler, selectionId, element, onChange }) => {
  const getEventId = ({ businessObject: { id } }) =>
    parseInt(id.split('-').pop(), 10);

  const isLocalId = (id) =>
    eventElementTypes.filter((type) => {
      const suffix = type.split(':').pop();
      return id.indexOf(suffix) === 0;
    }).length > 0;

  React.useEffect(() => {
    const getNextEventId = (element) => {
      const ids = modeler
        .get('elementRegistry')
        .getAll()
        .filter(
          ({ type, id }) =>
            eventElementTypes.includes(type) && id !== element.id,
        )
        .map(getEventId)
        .map(String)
        .map((id) => parseInt(id, 10));

      return minUnusedIndex(ids, 1);
    };

    const loadEvent = async () => {
      if (!isLocalId(element.businessObject.id)) {
        return;
      }

      const nextEventId = getNextEventId(element);

      if (!nextEventId) return;

      element.businessObject.id = ['end-event', nextEventId].join('-');
      element.businessObject.name = ['end-event', nextEventId].join('-');
      onChange(element.businessObject);
    };

    loadEvent();
  }, [selectionId, element, onChange, modeler]);

  return null;
};

EndEventElement.propTypes = {
  element: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  selectionId: PropTypes.string,
  modeler: PropTypes.object,
};

EndEventElement.defaultProps = {
  selectionId: null,
  modeler: null,
};

export default translate('WorkflowAdminPage')(EndEventElement);
