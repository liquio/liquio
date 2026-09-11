import React from 'react';
import { translate } from 'react-translate';
import minUnusedIndex from 'helpers/minUnusedIndex';

const eventElementTypes = ['bpmn:EndEvent', 'bpmn:Event'];

interface BpmnBusinessObject {
  id: string;
  name?: string;
  [key: string]: unknown;
}

interface BpmnElement {
  id: string;
  businessObject: BpmnBusinessObject;
}

interface ElementRegistryEntry {
  type: string;
  id: string;
}

interface ElementRegistry {
  getAll(): ElementRegistryEntry[];
}

interface EndEventElementProps {
  modeler?: BpmnJsInstance | null;
  selectionId?: string | null;
  element: BpmnElement;
  onChange: (businessObject: BpmnBusinessObject) => void;
}

const EndEventElement = ({ modeler, selectionId, element, onChange }: EndEventElementProps) => {
  const getEventId = ({ businessObject: { id } }: { businessObject: { id: string } }) =>
    parseInt(id.split('-').pop() as string, 10);

  const isLocalId = (id: string) =>
    eventElementTypes.filter((type) => {
      const suffix = type.split(':').pop() as string;
      return id.indexOf(suffix) === 0;
    }).length > 0;

  React.useEffect(() => {
    const getNextEventId = (element: BpmnElement) => {
      const ids = (modeler?.get('elementRegistry') as ElementRegistry)
        .getAll()
        .filter(
          ({ type, id }) =>
            eventElementTypes.includes(type) && id !== element.id,
        )
        .map(getEventId as never)
        .map(String)
        .map((id) => parseInt(id, 10));

      return minUnusedIndex(ids, 1);
    };

    const loadEvent = async () => {
      if (!isLocalId(element.businessObject.id)) {
        return;
      }

      const nextEventId = getNextEventId(element);

      if (!nextEventId) return;

      element.businessObject.id = ['end-event', nextEventId].join('-');
      element.businessObject.name = ['end-event', nextEventId].join('-');
      onChange(element.businessObject);
    };

    loadEvent();
  }, [selectionId, element, onChange, modeler]);

  return null;
};

export default translate('WorkflowAdminPage')(EndEventElement as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
