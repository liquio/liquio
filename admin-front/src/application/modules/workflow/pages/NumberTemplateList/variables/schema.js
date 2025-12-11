export default (readOnly = false) => ({
  type: 'object',
  properties: {
    name: {
      description: 'Назва',
      type: 'string',
      darkTheme: true,
      variant: 'outlined',
      checkValid: [
        {
          isValid: 'value => !!(value && value.length)',
          errorText: "Обов'язкове поле",
        },
      ],
      readOnly,
    },
    template: {
      description: 'Шаблон',
      type: 'string',
      darkTheme: true,
      variant: 'outlined',
      checkValid: [
        {
          isValid: 'value => !!(value && value.length)',
          errorText: "Обов'язкове поле",
        },
      ],
      readOnly,
    },
  },
  required: ['name', 'template'],
});
