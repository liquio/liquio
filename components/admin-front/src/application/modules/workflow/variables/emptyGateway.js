export default (
  gatewayId,
  { t, gatewayTypeId, workflow: { id: workflowTemplateId } },
) => ({
  id: gatewayId,
  workflowTemplateId,
  gatewayTypeId,
  name: t('NewGateway'),
  description: '',
  jsonSchema: {},
  jsonSchemaRaw: '{}',
});
