export default (t) => ({
  type: 'object',
  properties: {
    documentTemplateEntity: {
      type: 'object',
      description: t('DocumentTemplate'),
      properties: {
        additionalDataToSign: {
          control: 'code.editor',
          mode: 'javascript',
          description: t('AdditionalDataToSign'),
          darkTheme: true,
          validate: true,
          noMargin: true,
        },
        divider3: {
          control: 'divider',
          darkTheme: true,
          margin: 15,
        },
        accessJsonSchema: {
          description: t('Accesses'),
          type: 'object',
          noMargin: true,
          properties: {
            inboxes: {
              type: 'object',
              properties: {
                workflowCreator: {
                  control: 'toggle',
                  onText: t('InboxesAccess'),
                  darkTheme: true,
                  fullWidth: true,
                  labelPlacement: 'end',
                },
              },
            },
            workflowFiles: {
              type: 'object',
              properties: {
                workflowCreator: {
                  control: 'toggle',
                  onText: t('WorkflowFilesAccess'),
                  darkTheme: true,
                  fullWidth: true,
                  labelPlacement: 'end',
                },
              },
            },
          },
        },
        divider4: {
          control: 'divider',
          darkTheme: true,
          margin: 15,
        },
      },
      required: [],
    },
  },
  required: [],
});
