interface GatewayType {
  id: string;
  name: string;
}

interface BpmnElementLike {
  type: string;
}

export default ({ type }: BpmnElementLike, gatewayTypes: GatewayType[] = []) => {
  const matches = type.match(/bpmn:(.+)Gateway/);
  if (!matches) {
    return gatewayTypes[0].id;
  }

  const gatewayType =
    gatewayTypes.find(
      ({ name }) => name.toLowerCase() === matches[1].toLowerCase(),
    ) || gatewayTypes[0];
  return gatewayType && gatewayType.id;
};
