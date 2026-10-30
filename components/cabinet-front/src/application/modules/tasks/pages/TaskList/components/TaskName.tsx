import React from 'react';
import { connect } from 'react-redux';

interface TaskTemplate {
  id?: string | number;
  taskTemplate?: { name?: string };
}

interface TaskLike {
  taskTemplateId?: string | number;
  name?: string;
}

interface TaskNameProps {
  templates?: TaskTemplate[];
  task: TaskLike;
}

const TaskName = ({ templates, task }: TaskNameProps) => {
  const template = (templates || []).find(({ id }) => id === task.taskTemplateId);

  if (!template) {
    return null;
  }

  return (task || {}).name || (template.taskTemplate || {}).name || 'Unnamed';
};

interface DocumentTemplateState {
  documentTemplate: { list: TaskTemplate[] };
}

export default connect(({ documentTemplate: { list } }: DocumentTemplateState) => ({
  templates: list
}))(TaskName as never) as unknown as React.ComponentType<Record<string, unknown>>;
