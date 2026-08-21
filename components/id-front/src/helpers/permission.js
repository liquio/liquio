export const permissions = [
  { name: 'allowShare', textId: 4 },
  { name: 'allowCommit', textId: 3 },
  { name: 'allowEdit', textId: 2 },
  { name: 'allowRead', textId: 1 },
];

export default (share) => permissions.find((item) => share[item.name] === 1) || permissions[3];
