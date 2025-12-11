/* eslint-disable no-sequences */
export default (task, version, { workflowId }) => {
  if (!task) {
    return null;
  }

  const documentTemplate =
    (version?.data?.documentTemplates || []).find(
      ({ id }) => id === task?.documentTemplateId,
    ) || {};

  return {
    documentTemplateEntity: documentTemplate,
    taskTemplateEntity: task,
    workflowTemplateId: workflowId,
  };
};
