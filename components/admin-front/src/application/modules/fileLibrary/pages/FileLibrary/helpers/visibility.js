export const PRIVATE_VISIBILITY = 'private';

export const buildParentPayload = (parentId) => (parentId ? { parent_id: parentId } : {});
