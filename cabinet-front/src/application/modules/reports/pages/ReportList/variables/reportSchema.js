export default ({ t }) => ({
  type: 'object',
  calcTriggers: [
    {
      source: 'template',
      target: 'name',
      calculate: "value => value?.label + ' [' + moment().format('DD.MM.YYYY HH:mm') + ']'"
    }
  ],
  properties: {
    template: {
      control: 'report.draft.select',
      description: t('ReportDraft')
    },
    name: {
      type: 'string',
      description: t('ReportName')
    }
  },
  required: ['name', 'template']
});
