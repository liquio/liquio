interface PermissionDef {
  name: string;
  textId: number;
}

interface ShareLike {
  allowShare?: number;
  allowCommit?: number;
  allowEdit?: number;
  allowRead?: number;
  [key: string]: unknown;
}

export const permissions: PermissionDef[] = [
  { name: 'allowShare', textId: 4 },
  { name: 'allowCommit', textId: 3 },
  { name: 'allowEdit', textId: 2 },
  { name: 'allowRead', textId: 1 }
];

const getPermission = (share: ShareLike): PermissionDef =>
  permissions.find((item) => item.name !== 'allowShare' && share[item.name] === 1) || permissions[3];

export const getPermText = (t: (key: string) => string, share: ShareLike): string =>
  `${t(`ABBR_PERMISSION_${getPermission(share).textId}`)}${share.allowShare === 1 ? t('ABBR_PERMISSION_4') : ''}`;

export default getPermission;
