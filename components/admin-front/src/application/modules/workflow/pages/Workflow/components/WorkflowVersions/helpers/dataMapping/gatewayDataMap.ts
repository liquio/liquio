/* eslint-disable no-sequences */
interface GatewayTemplate {
  id?: unknown;
  name?: unknown;
  jsonSchema?: unknown;
  htmlTemplate?: unknown;
  accessJsonSchema?: unknown;
  additionalDataToSign?: unknown;
}

export default (gateway: GatewayTemplate | null | undefined) =>
  gateway && {
    id: gateway.id,
    name: gateway.name,
    jsonSchema: JSON.stringify(gateway.jsonSchema),
    htmlTemplate: gateway.htmlTemplate,
    accessJsonSchema: JSON.stringify(gateway.accessJsonSchema),
    additionalDataToSign: gateway.additionalDataToSign,
  };
