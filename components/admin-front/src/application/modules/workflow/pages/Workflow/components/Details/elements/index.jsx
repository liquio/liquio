import gatewayElementTypes from 'application/modules/workflow/variables/gatewayElementTypes';
import eventElementTypes from 'application/modules/workflow/variables/eventElementTypes';
import taskElementTypes from 'application/modules/workflow/variables/taskElementTypes';

import TaskElement from './Task';
import GatewayElement from './Gateway';
import EventElement from './Event';
import EndEventElement from './EndEvent';

export default {
  ...gatewayElementTypes.reduce(
    (acc, type) => ({ ...acc, [type]: GatewayElement }),
    {},
  ),
  ...eventElementTypes.reduce(
    (acc, type) => ({ ...acc, [type]: EventElement }),
    {},
  ),
  ...taskElementTypes.reduce(
    (acc, type) => ({ ...acc, [type]: TaskElement }),
    {},
  ),
  'bpmn:EndEvent': EndEventElement,
};
