/* eslint-disable no-sequences */
interface EventTemplate {
  createdAt?: unknown;
  updatedAt?: unknown;
  jsonSchema?: unknown;
  workflowTemplateId?: unknown;
  [key: string]: unknown;
}

export default (event: EventTemplate | null | undefined, current: unknown, { workflowId }: { workflowId: unknown }) =>
  event && {
    ...event,
    createdAt: undefined,
    updatedAt: undefined,
    jsonSchema: JSON.stringify(event.jsonSchema),
    workflowTemplateId: workflowId,
  };
