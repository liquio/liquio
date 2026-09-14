export const PRIVATE_VISIBILITY = 'private';

export const buildParentPayload = (parentId?: string | null): { parent_id: string } | Record<string, never> =>
  parentId ? { parent_id: parentId } : {};
