import normalizeElementId from './normalizeElementId';

export default ({ businessObject: { id, name } }) => ({
  name,
  id: normalizeElementId(id),
});
