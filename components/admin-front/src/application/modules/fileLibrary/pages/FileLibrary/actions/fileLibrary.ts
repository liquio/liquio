import * as api from 'services/api';

import { buildParentPayload, PRIVATE_VISIBILITY } from '../helpers/visibility';
import { Grant } from '../variables/defaultGrant';

type Dispatch = (action: unknown) => unknown;

export interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  grants?: Grant[];
  [key: string]: unknown;
}

export const getItems = ({ dispatch, parentId }: { dispatch: Dispatch; parentId?: string | null }) => {
  const query = parentId ? `?parent_id=${parentId}` : '';
  return api.get(`file-library/items${query}`, 'FILE_LIBRARY_ITEMS', dispatch);
};

export const getItem = ({ dispatch, id }: { dispatch: Dispatch; id: string }) =>
  api.get(`file-library/items/${id}`, 'FILE_LIBRARY_ITEM', dispatch);

export const createFolder = ({
  dispatch,
  name,
  parentId
}: {
  dispatch: Dispatch;
  name: string;
  parentId?: string | null;
}) =>
  api.post(
    'file-library/folders',
    {
      name,
      ...buildParentPayload(parentId),
      visibility: PRIVATE_VISIBILITY
    },
    'FILE_LIBRARY_CREATE_FOLDER',
    dispatch
  );

export const uploadFile = ({
  dispatch,
  file,
  parentId
}: {
  dispatch: Dispatch;
  file: File;
  parentId?: string | null;
}) =>
  api.upload(
    'file-library/files',
    file,
    {
      name: file.name,
      ...buildParentPayload(parentId),
      visibility: PRIVATE_VISIBILITY
    },
    'FILE_LIBRARY_UPLOAD_FILE',
    dispatch
  );

export const removeItem = ({ dispatch, id }: { dispatch: Dispatch; id: string }) =>
  api.del(`file-library/items/${id}`, {}, 'FILE_LIBRARY_DELETE_ITEM', dispatch);

export const downloadItem = async ({ dispatch, item }: { dispatch: Dispatch; item: FileItem }) => {
  const blob = await api.get(
    `file-library/items/${item.id}/download`,
    'FILE_LIBRARY_DOWNLOAD',
    dispatch
  );
  const url = URL.createObjectURL(blob as Blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = item.name;
  link.click();
  URL.revokeObjectURL(url);
};

export const createPublicLink = async ({ dispatch, id }: { dispatch: Dispatch; id: string }) => {
  const result = (await api.post(
    `file-library/items/${id}/public-link`,
    {},
    'FILE_LIBRARY_PUBLIC_LINK',
    dispatch
  )) as { publicUrl: string };
  return `${api.getApiUrl().replace(/\/$/, '')}${result.publicUrl}`;
};

export const saveAccess = ({
  dispatch,
  itemId,
  grants
}: {
  dispatch: Dispatch;
  itemId: string;
  grants: Grant[];
}) =>
  api.put(
    `file-library/items/${itemId}/access`,
    { grants: grants.filter((grant) => grant.subjectId) },
    'FILE_LIBRARY_ACCESS',
    dispatch
  );

export const getPreview = ({ dispatch, id }: { dispatch: Dispatch; id: string }) =>
  api.get(`file-library/items/${id}/preview`, 'FILE_LIBRARY_PREVIEW', dispatch);
