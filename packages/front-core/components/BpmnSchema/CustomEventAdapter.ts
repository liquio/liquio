import CoreModule from 'diagram-js/lib/core';

type BpmnElement = Record<string, unknown>;

interface EventBus {
  on: (event: string, handler: (payload: { element: BpmnElement }) => void) => void;
  fire: (event: string, props?: unknown) => void;
}

interface CustomEventAdapterHandlers {
  onChange?: (element: BpmnElement) => void;
  onSelect?: (element: BpmnElement) => void;
  onCreate?: (element: BpmnElement) => void;
  onDelete?: (element: BpmnElement) => void;
}

class CustomEventAdapter {
  eventBus?: EventBus;

  init = (props: CustomEventAdapterHandlers) => (eventBus: EventBus) => {
    this.eventBus = eventBus;
    this.initHandlers(props);
  };

  initHandlers = ({ onChange, onSelect, onCreate, onDelete }: CustomEventAdapterHandlers) => {
    this.eventBus!.on('shape.added', ({ element }) => onCreate && onCreate(element));
    this.eventBus!.on('shape.removed', ({ element }) => onDelete && onDelete(element));
    this.eventBus!.on('element.changed', ({ element }) => onChange && onChange(element));
    this.eventBus!.on('element.click', ({ element }) => onSelect && onSelect(element));
  };

  fire = (event: string, props?: unknown) => {
    this.eventBus!.fire(event, props);
  };

  modeler = (props: CustomEventAdapterHandlers) => ({
    __depends__: [CoreModule],
    __init__: ['CustomEventAdapter'],
    CustomEventAdapter: ['type', this.init(props)]
  });
}

const customEventAdapter = new CustomEventAdapter();

export default customEventAdapter;
