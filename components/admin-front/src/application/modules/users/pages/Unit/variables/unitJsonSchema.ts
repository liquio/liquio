import type { JsonSchemaNode } from 'components/JsonSchema/types';

export default (t: (key: string) => string): JsonSchemaNode => ({
  type: 'object',
  properties: {
    basedOn: {
      control: 'unit.list',
      darkTheme: true,
      variant: 'outlined',
      description: t('BasedOn')
    }
  }
});
