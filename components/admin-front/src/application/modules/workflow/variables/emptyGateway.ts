interface EmptyGatewayContext {
  t: (key: string) => string;
  gatewayTypeId?: string | number;
  workflow: { id?: string | number };
}

export default (
  gatewayId: string | number,
  { t, gatewayTypeId, workflow: { id: workflowTemplateId } }: EmptyGatewayContext,
) => ({
  id: gatewayId,
  workflowTemplateId,
  gatewayTypeId,
  name: t('NewGateway'),
  description: '',
  jsonSchema: {},
  jsonSchemaRaw: '{}',
});
