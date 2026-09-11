import React from 'react';
import ReactDOMServer from 'react-dom/server';
import moment from 'moment';
import classNames from 'classnames';

const getStatusElementId = ({ type, details }) => [type, details[type + 'TemplateId']].join('-');

const getErrorStatusElementId = ({
  details: { serviceName: type, data: { queueMessage: details = {} } = {} }
} = {}) => getStatusElementId({ type, details });

export default (props) => {
  const Statuses = (props) => (eventBus, overlays) => {
    const { classes, data = [] } = props;

    const addOverlay = (text, element, className) => {
      const html = ReactDOMServer.renderToStaticMarkup(
        <div id={element.id} className={classNames(classes.overlay, className)}>
          <div className="details">{text}</div>
        </div>
      );

      overlays.add(element, 'statuses', {
        position: {
          top: 10,
          left: 10
        },
        html
      });
    };

    const addStatusOverlay = ({ updatedAt }, element) => {
      addOverlay(moment(updatedAt).format('DD.MM.YYYY HH:mm'), element);
    };

    const addErrorStatusOverlay = ({ details: { data: { error = '' } = {} } = {} }, element) => {
      addOverlay(error, element, classes.errorOverlay);
    };

    eventBus.on('shape.added', ({ element, element: { id: elementId } }) => {
      data
        .filter((status) => getStatusElementId(status) === elementId)
        .forEach((status) => addStatusOverlay(status, element));

      data
        .filter(({ type }) => type === 'error')
        .filter((status) => getErrorStatusElementId(status) === elementId)
        .forEach((status) => addErrorStatusOverlay(status, element));
    });
  };

  try {
    return {
      __init__: ['statuses'],
      statuses: ['type', Statuses(props)]
    };
  } catch (e) {
    console.log('BpmnViewer additionalModules error =>', e);
  }
};
