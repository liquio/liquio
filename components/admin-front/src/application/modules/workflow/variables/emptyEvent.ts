interface EventTypeItem {
  id?: string | number;
  [key: string]: unknown;
}

interface EmptyEventContext {
  t: (key: string) => string;
  eventTypes?: EventTypeItem[];
  workflow: { id?: string | number };
}

export default (
  eventId: string | number,
  { t, eventTypes, workflow: { id: workflowTemplateId } }: EmptyEventContext,
) => {
  const type = (eventTypes || [])[0];

  return {
    id: eventId,
    workflowTemplateId,
    eventTypeId: type && type.id,
    name: t('NewEvent'),
    description: '',
    jsonSchema: '{}',
    jsonSchemaRaw: '{}',
    htmlTemplate: '',
  };
};
