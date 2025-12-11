export const permissions = [
  { name: 'allowShare', textId: 4 },
  { name: 'allowCommit', textId: 3 },
  { name: 'allowEdit', textId: 2 },
  { name: 'allowRead', textId: 1 },
];

const getPermission = (share) =>
  permissions.find(
    (item) => item.name !== 'allowShare' && share[item.name] === 1,
  ) || permissions[3];

export const getPermText = (t, share) =>
  `${t(`ABBR_PERMISSION_${getPermission(share).textId}`)}${
    share.allowShare === 1 ? t('ABBR_PERMISSION_4') : ''
  }`;

export default getPermission;
