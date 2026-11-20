interface EmptyTaskContext {
  t: (key: string) => string;
  workflow: { id?: string | number };
}

export default (taskId: string | number, { t, workflow: { id: workflowTemplateId } }: EmptyTaskContext) => {
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
