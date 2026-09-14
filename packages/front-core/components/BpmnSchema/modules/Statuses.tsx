import React from 'react';
import ReactDOMServer from 'react-dom/server';
import moment from 'moment';
import classNames from 'classnames';

interface StatusDetails {
  serviceName?: string;
  data?: { queueMessage?: Record<string, unknown>; error?: string };
  [key: string]: unknown;
}

interface Status {
  type: string;
  details: StatusDetails;
  updatedAt?: string | number;
}

interface BpmnElement {
  id: string;
}

const getStatusElementId = ({ type, details }: Status) => [type, details[type + 'TemplateId']].join('-');

const getErrorStatusElementId = ({
  details: { serviceName: type, data: { queueMessage: details = {} } = {} } = {}
}: Partial<Status> = {}) => getStatusElementId({ type, details } as Status);

interface StatusesProps {
  classes: Record<string, string>;
  data?: Status[];
}

export default (props: StatusesProps) => {
  const Statuses = (props: StatusesProps) => (eventBus: { on: (event: string, handler: (payload: { element: BpmnElement & { id: string } }) => void) => void }, overlays: { add: (element: BpmnElement, type: string, options: Record<string, unknown>) => void }) => {
    const { classes, data = [] } = props;

    const addOverlay = (text: string, element: BpmnElement, className?: string) => {
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

    const addStatusOverlay = ({ updatedAt }: Status, element: BpmnElement) => {
      addOverlay(moment(updatedAt).format('DD.MM.YYYY HH:mm'), element);
    };

    const addErrorStatusOverlay = ({ details: { data: { error = '' } = {} } = {} }: Partial<Status>, element: BpmnElement) => {
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
