import React from 'react';
import RejectWorkflow from './RejectWorkflow';

const widgets: Record<string, React.ComponentType<Record<string, unknown>>> = {
  reject_workflow: RejectWorkflow
};

export default widgets;
