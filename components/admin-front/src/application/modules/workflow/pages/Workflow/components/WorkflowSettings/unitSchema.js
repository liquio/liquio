export default ({ t }) => ({
  type: 'object',
  properties: {
    data: {
      type: 'object',
      properties: {
        divider: {
          control: 'text.block',
          htmlBlock: '<div style="margin-bottom: 10px;" />',
        },
        createdByUnitHeads: {
          control: 'code.editor',
          description: t('CreatedByUnitHeads'),
          mode: 'javascript',
          darkTheme: true,
          validate: true,
          noMargin: true,
        },
        divider2: {
          control: 'text.block',
          htmlBlock: '<div style="margin-bottom: 10px;" />',
        },
        createdByUnits: {
          control: 'code.editor',
          description: t('CreatedByUnits'),
          mode: 'javascript',
          darkTheme: true,
          validate: true,
          noMargin: true,
        },
        divider3: {
          control: 'text.block',
          htmlBlock: '<div style="margin-bottom: 10px;" />',
        },
        createdByIpn: {
          control: 'code.editor',
          description: t('СreatedByIpn'),
          mode: 'javascript',
          darkTheme: true,
          validate: true,
          noMargin: true,
        },
        divider4: {
          control: 'text.block',
          htmlBlock: '<div style="margin-bottom: 10px;" />',
        },
        observerUnits: {
          control: 'code.editor',
          description: t('ObserverUnits'),
          mode: 'javascript',
          darkTheme: true,
          validate: true,
          noMargin: true,
        },
        divider5: {
          control: 'text.block',
          htmlBlock: '<div style="margin-bottom: 10px;" />',
        },
        isPersonal: {
          control: 'code.editor',
          description: 'isPersonal',
          mode: 'javascript',
          darkTheme: true,
          validate: true,
          noMargin: true,
        },
      },
    },
  },
  required: [],
});
