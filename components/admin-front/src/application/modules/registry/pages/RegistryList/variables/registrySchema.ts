import type { JsonSchemaNode } from 'components/JsonSchema/types';

interface RegistrySchemaParams {
  t: (key: string, params?: Record<string, unknown>) => string;
}

export default ({ t }: RegistrySchemaParams): JsonSchemaNode => ({
  type: 'object',
  properties: {
    name: {
      type: 'string',
      description: t('Name'),
      useTrim: true,
      maxLength: 255,
      darkTheme: true,
      variant: 'outlined',
      checkValid: [
        {
          isValid: '(propertyData) => !!(propertyData && propertyData.length)',
          errorText: "Обов'язкове поле",
        },
      ],
    },
    description: {
      type: 'string',
      description: t('RegisterNameInCabinet'),
      useTrim: true,
      maxLength: 255,
      darkTheme: true,
      variant: 'outlined',
      checkValid: [
        {
          isValid: '(propertyData) => !!(propertyData && propertyData.length)',
          errorText: "Обов'язкове поле",
        },
      ],
    },
    parentId: {
      control: 'register.select',
      darkTheme: true,
      variant: 'outlined',
      description: t('ParentId'),
    },
  },
  required: ['name', 'description'],
});
