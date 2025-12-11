import CoreModule from 'diagram-js/lib/core';

class CustomEventAdapter {
  init = (props) => (eventBus) => {
    this.eventBus = eventBus;
    this.initHandlers(props);
  };

  initHandlers = ({ onChange, onSelect, onCreate, onDelete }) => {
    this.eventBus.on('shape.added', ({ element }) => onCreate && onCreate(element));
    this.eventBus.on('shape.removed', ({ element }) => onDelete && onDelete(element));
    this.eventBus.on('element.changed', ({ element }) => onChange && onChange(element));
    this.eventBus.on('element.click', ({ element }) => onSelect && onSelect(element));
  };

  fire = (event, props) => {
    this.eventBus.fire(event, props);
  };

  modeler = (props) => ({
    __depends__: [CoreModule],
    __init__: ['CustomEventAdapter'],
    CustomEventAdapter: ['type', this.init(props)]
  });
}

const customEventAdapter = new CustomEventAdapter();

export default customEventAdapter;
