const ROOT_PATH = '/file-library';
const FOLDER_PATH = `${ROOT_PATH}/folder`;

export const getFolderIdsFromPath = (folderPath?: string): string[] =>
  folderPath ? folderPath.split('/').filter(Boolean) : [];

export const getFolderPath = (folderIds: string[] = []): string => {
  if (!folderIds.length) {
    return ROOT_PATH;
  }

  return `${FOLDER_PATH}/${folderIds.join('/')}`;
};

interface Folder {
  id: string;
  name: string;
}

interface Breadcrumb {
  id: string;
  name: string;
  path: string;
}

export const getBreadcrumbs = (folderStack: Folder[] = []): Breadcrumb[] => [
  {
    id: 'root',
    name: 'Root',
    path: ROOT_PATH
  },
  ...folderStack.map((folder, index) => ({
    id: folder.id,
    name: folder.name,
    path: getFolderPath(folderStack.slice(0, index + 1).map(({ id }) => id))
  }))
];
