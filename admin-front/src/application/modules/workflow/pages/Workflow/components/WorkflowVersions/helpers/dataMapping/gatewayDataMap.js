/* eslint-disable no-sequences */
export default (gateway) =>
  gateway && {
    id: gateway.id,
    name: gateway.name,
    jsonSchema: JSON.stringify(gateway.jsonSchema),
    htmlTemplate: gateway.htmlTemplate,
    accessJsonSchema: JSON.stringify(gateway.accessJsonSchema),
    additionalDataToSign: gateway.additionalDataToSign,
  };
