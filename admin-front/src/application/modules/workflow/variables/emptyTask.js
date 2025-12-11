export default (taskId, { t, workflow: { id: workflowTemplateId } }) => {
  const taskName = t('NewTask');

  return {
    workflowTemplateId,
    documentTemplateEntity: {
      id: taskId,
      name: taskName,
      jsonSchema: {},
      jsonSchemaRaw: '',
      accessJsonSchema: {
        inboxes: {
          workflowCreator: false,
        },
        workflowFiles: {
          workflowCreator: false,
        },
      },
      htmlTemplate: '',
    },
    taskTemplateEntity: {
      id: taskId,
      name: taskName,
      jsonSchema: {
        setPermissions: [
          {
            performerUsersIsWorkflowOwner: true,
          },
        ],
      },
      jsonSchemaRaw: '',
      htmlTemplate: '',
      documentTemplateId: taskId,
    },
  };
};
