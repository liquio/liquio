import React from 'react';
import widgets from './widgets';

interface NameTokenProps {
  body: string;
}

export default ({ body }: NameTokenProps) => {
  const [widgetName, params] = body.split('=');

  const WidgetComponent = widgets[widgetName];

  if (!WidgetComponent) {
    return <div>{`${widgetName} widget not defined`}</div>;
  }

  return <WidgetComponent params={params} />;
};
