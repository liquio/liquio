import React from 'react';
import widgets from './widgets';

export default ({ body }) => {
  const [widgetName, params] = body.split('=');

  const WidgetComponent = widgets[widgetName];

  if (!WidgetComponent) {
    return <div>{`${widgetName} widget not defined`}</div>;
  }

  return <WidgetComponent params={params} />;
};
