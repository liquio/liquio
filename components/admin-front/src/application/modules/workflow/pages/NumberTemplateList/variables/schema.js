export default ({ t, readOnly = false }) => ({
  type: 'object',
  properties: {
    name: {
      description: t('Name'),
      type: 'string',
      darkTheme: true,
      variant: 'outlined',
      checkValid: [
        {
          isValid: 'value => !!(value && value.length)',
          errorText: t('RequiredField'),
        },
      ],
      readOnly,
    },
    template: {
      description: t('TemplateName'),
      type: 'string',
      darkTheme: true,
      variant: 'outlined',
      checkValid: [
        {
          isValid: 'value => !!(value && value.length)',
          errorText: t('RequiredField'),
        },
      ],
      readOnly,
    },
  },
  required: ['name', 'template'],
});
