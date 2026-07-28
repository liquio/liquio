export default ({ t }) => ({
  type: 'object',
  properties: {
    name: {
      type: 'string',
      darkTheme: true,
      variant: 'outlined',
      description: t('Name'),
    },
    data: {
      type: 'object',
      control: 'form.group',
      blockDisplay: true,
      outlined: false,
      properties: {
        provider: {
          type: 'string',
          darkTheme: true,
          variant: 'outlined',
          description: t('Provider'),
        },
        link: {
          type: 'string',
          darkTheme: true,
          variant: 'outlined',
          description: t('Link'),
        },
        tags: {
          type: 'array',
          control: 'tags',
          darkTheme: true,
          minItems: 1,
          variant: 'outlined',
          description: t('Tags'),
        },
      },
      required: ['provider', 'link', 'tags'],
    },
    accessUnits: {
      type: 'array',
      minItems: 1,
      darkTheme: true,
      variant: 'outlined',
      control: 'unit.list',
      description: t('Units'),
    },
  },
  required: ['name', 'data', 'accessUnits'],
});
