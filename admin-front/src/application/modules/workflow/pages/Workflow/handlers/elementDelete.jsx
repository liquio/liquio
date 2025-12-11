const PARALLEL_GATEWAY_TYPE = 'bpmn:ParallelGateway';

export default (modeler) => (element) => {
  const modeling = modeler.get('modeling');
  const elementRegistry = modeler.get('elementRegistry');

  if (element.type === PARALLEL_GATEWAY_TYPE) {
    const {
      businessObject: { id },
    } = element;
    if (id.indexOf('_') < 0 && id.slice(id.length - 3) !== 'end') {
      const endId = id + '-end';
      const existed = elementRegistry.get(endId);

      if (existed) {
        modeling.removeShape(existed);
      }
    }
  }
};
