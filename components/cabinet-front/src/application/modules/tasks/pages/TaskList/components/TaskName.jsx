import { connect } from 'react-redux';

const TaskName = ({ templates, task }) => {
  const template = (templates || []).find(({ id }) => id === task.taskTemplateId);

  if (!template) {
    return null;
  }

  return (task || {}).name || (template.taskTemplate || {}).name || 'Unnamed';
};

export default connect(({ documentTemplate: { list } }) => ({
  templates: list
}))(TaskName);
