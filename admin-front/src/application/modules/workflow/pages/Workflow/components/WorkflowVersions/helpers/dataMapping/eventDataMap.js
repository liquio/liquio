/* eslint-disable no-sequences */
export default (event, current, { workflowId }) =>
  event && {
    ...event,
    createdAt: undefined,
    updatedAt: undefined,
    jsonSchema: JSON.stringify(event.jsonSchema),
    workflowTemplateId: workflowId,
  };
