export default (t) => ({
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
