const Decorator = require('./decorator');

// Constants.
const TREMBITA_TEMPLATE = `<soapenv:Envelope 
    xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" 
    xmlns:xro="http://x-road.eu/xsd/xroad.xsd" 
    xmlns:iden="http://x-road.eu/xsd/identifiers"
    xmlns:v1="http://uis/dev/service/GetCountryName/v1"
  >
  <soapenv:Header>
    <xro:client iden:objectType="{header.client.objectType}">
      <iden:xRoadInstance>{header.client.xRoadInstance}</iden:xRoadInstance>
      <iden:memberClass>{header.client.memberClass}</iden:memberClass>
      <iden:memberCode>{header.client.memberCode}</iden:memberCode>
      <iden:subsystemCode>{header.client.subsystemCode}</iden:subsystemCode>
    </xro:client>
    <xro:service iden:objectType="{header.service.objectType}">
      <iden:xRoadInstance>{header.service.xRoadInstance}</iden:xRoadInstance>
      <iden:memberClass>{header.service.memberClass}</iden:memberClass>
      <iden:memberCode>{header.service.memberCode}</iden:memberCode>
      <iden:subsystemCode>{header.service.subsystemCode}</iden:subsystemCode>
      <iden:serviceCode>listMethods</iden:serviceCode>
    </xro:service>
    <xro:userId>{header.userId}</xro:userId>
    <xro:id>{header.id}</xro:id>
    <xro:protocolVersion>{header.protocolVersion}</xro:protocolVersion>
  </soapenv:Header>
  <soapenv:Body>
    <v1:listMethods/>
  </soapenv:Body>
</soapenv:Envelope>`;

/**
 * Decorator Trembita.
 * @typedef {import('../../../../../entities/document')} DocumentEntity
 */
class DecoratorTrembitaListMethods extends Decorator {
  /**
   * Transform.
   * @param {object} data Data to transform.
   * @param {string} data.providerName Provider name.
   * @param {object} data.documentTemplateId Document template ID.
   * @returns {Promise<object>} Data to send promise.
   */
  async transform(_data) {
    // Get params.
    const timestamp = +new Date();

    // Trembita SOAP message container.
    let soapMessage = TREMBITA_TEMPLATE;

    // Append Trembita header configs.
    const {
      requester: {
        externalService: {
          trembita: { trembitaHeader },
        },
      },
    } = global.config;
    const headerId = timestamp;
    soapMessage = soapMessage
      .replace('{header.client.objectType}', trembitaHeader.client.objectType)
      .replace('{header.client.xRoadInstance}', trembitaHeader.client.xRoadInstance)
      .replace('{header.client.memberClass}', trembitaHeader.client.memberClass)
      .replace('{header.client.memberCode}', trembitaHeader.client.memberCode)
      .replace('{header.client.subsystemCode}', trembitaHeader.client.subsystemCode)
      .replace('{header.service.objectType}', trembitaHeader.service.objectType)
      .replace('{header.service.xRoadInstance}', trembitaHeader.service.xRoadInstance)
      .replace('{header.service.memberClass}', trembitaHeader.service.memberClass)
      .replace('{header.service.memberCode}', trembitaHeader.service.memberCode)
      .replace('{header.service.subsystemCode}', trembitaHeader.service.subsystemCode)
      .replace('{header.service.serviceCode}', trembitaHeader.service.serviceCode)
      .replace('{header.service.serviceVersion}', trembitaHeader.service.serviceVersion)
      .replace('{header.userId}', trembitaHeader.userId)
      .replace('{header.id}', headerId)
      .replace('{header.protocolVersion}', trembitaHeader.protocolVersion);

    // Define and return transformed data.
    const transformedData = { soapMessage };
    return transformedData;
  }
}

module.exports = DecoratorTrembitaListMethods;
