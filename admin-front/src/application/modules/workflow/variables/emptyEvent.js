export default (
  eventId,
  { t, eventTypes, workflow: { id: workflowTemplateId } },
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
