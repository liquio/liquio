import getTemplateSteps from 'modules/tasks/pages/Task/helpers/getTemplateSteps';

export default (props) => {
  const { tasks, origins, templates, taskId, stepId, workflowTemplateId, authInfo } = props;

  let task;
  let origin;
  let template;
  let steps;

  if (taskId) {
    task = tasks[taskId];
    origin = origins[taskId];
    if (task) {
      template = templates[task.taskTemplateId];
      if (template) {
        steps = getTemplateSteps(task, template, authInfo);
      }
    }
  }

  return {
    taskId,
    task,
    origin,
    steps,
    template,
    stepId,
    workflowTemplateId,
    authInfo
  };
};
