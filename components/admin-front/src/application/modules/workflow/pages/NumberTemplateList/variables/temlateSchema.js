export default (t) => ({
  'type': 'object',
  'properties': {
    'name': {
      'description': t('Name'),
      'type': 'string',
      'darkTheme': true,
      'variant': 'outlined',
      'checkValid': [
        {
          'isValid': 'value => !!(value && value.length)',
          'errorText': t('RequiredField')
        }
      ]
    },
    'template': {
      'description': t('TemplateName'),
      'type': 'string',
      'darkTheme': true,
      'variant': 'outlined',
      'checkValid': [
        {
          'isValid': 'value => !!(value && value.length)',
          'errorText': t('RequiredField')
        }
      ]
    }
  },
  'required': ['name', 'template']
});
