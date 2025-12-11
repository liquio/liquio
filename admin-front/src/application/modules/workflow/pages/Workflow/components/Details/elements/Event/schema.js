export default ({ eventTypes, t }) => ({
  type: 'object',
  properties: {
    eventTypeId: {
      description: t('EventType'),
      control: 'string.element',
      options: (eventTypes || []).filter(({ id }) => id),
      noMargin: true,
      darkTheme: true,
      deleteIcon: false,
      variant: 'outlined',
    },
    divider2: {
      control: 'divider',
      darkTheme: true,
      margin: 15,
    },
    jsonSchemaRaw: {
      control: 'code.editor',
      description: t('EventSchema'), // "Схема події",
      mode: 'json5',
      validate: true,
      darkTheme: true,
      noMargin: true,
    },
    divider3: {
      control: 'divider',
      darkTheme: true,
      margin: 15,
    },
  },
  required: ['eventTypeId', 'jsonSchema'],
});
