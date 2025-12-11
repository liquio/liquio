export default ({ t }) => ({
  type: 'object',
  properties: {
    data: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: t('ReportName'),
          darkTheme: true,
          variant: 'outlined',
          minLength: 10,
        },
        schema: {
          control: 'code.editor',
          description: t('Parameters'),
          mode: 'json',
          validate: true,
          asJsonObject: true,
        },
      },
      required: ['name'],
    },
    meta: {
      type: 'object',
      properties: {
        access: {
          type: 'array',
          minItems: 1,
          control: 'unit.list',
          darkTheme: true,
          variant: 'outlined',
          description: t('UnitMember'),
        },
      },
    },
    sql: {
      control: 'code.editor',
      description: t('SqlQuery'),
      mode: 'sql',
      validate: true,
    },
    pdfTemplate: {
      control: 'code.editor',
      description: t('PdfTemplate'),
      mode: 'html',
      validate: true,
    },
  },
  required: ['data'],
});
