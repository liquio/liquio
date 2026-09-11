const ROOT_PATH = '/file-library';
const FOLDER_PATH = `${ROOT_PATH}/folder`;

export const getFolderIdsFromPath = (folderPath) =>
  folderPath ? folderPath.split('/').filter(Boolean) : [];

export const getFolderPath = (folderIds = []) => {
  if (!folderIds.length) {
    return ROOT_PATH;
  }

  return `${FOLDER_PATH}/${folderIds.join('/')}`;
};

export const getBreadcrumbs = (folderStack = []) => [
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
