const PARALLEL_GATEWAY_TYPE = 'bpmn:ParallelGateway';

interface Modeling {
  removeShape(element: unknown): void;
}

interface ElementRegistry {
  get(id: string): unknown;
}

interface BpmnElementLike {
  type: string;
  businessObject: { id: string };
}

export default (modeler: BpmnJsInstance) => (element: BpmnElementLike) => {
  const modeling = modeler.get('modeling') as Modeling;
  const elementRegistry = modeler.get('elementRegistry') as ElementRegistry;

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
