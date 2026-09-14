import React from 'react';
import gatewayElementTypes from 'application/modules/workflow/variables/gatewayElementTypes';
import eventElementTypes from 'application/modules/workflow/variables/eventElementTypes';
import taskElementTypes from 'application/modules/workflow/variables/taskElementTypes';

import TaskElement from './Task';
import GatewayElement from './Gateway';
import EventElement from './Event';
import EndEventElement from './EndEvent';

type ElementComponent = React.ComponentType<Record<string, unknown>>;

const formElements: Record<string, ElementComponent> = {
  ...gatewayElementTypes.reduce(
    (acc, type) => ({ ...acc, [type]: GatewayElement as ElementComponent }),
    {} as Record<string, ElementComponent>,
  ),
  ...eventElementTypes.reduce(
    (acc, type) => ({ ...acc, [type]: EventElement as ElementComponent }),
    {} as Record<string, ElementComponent>,
  ),
  ...taskElementTypes.reduce(
    (acc, type) => ({ ...acc, [type]: TaskElement as ElementComponent }),
    {} as Record<string, ElementComponent>,
  ),
  'bpmn:EndEvent': EndEventElement as ElementComponent,
};

export default formElements;
