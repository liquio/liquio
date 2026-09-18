import normalizeElementId from './normalizeElementId';

interface BpmnElementLike {
  businessObject: { id: string; name?: string };
}

export default ({ businessObject: { id, name } }: BpmnElementLike) => ({
  name,
  id: normalizeElementId(id),
});
