import objectPath from 'object-path';

export default (propertyPath, userUnits) =>
  userUnits.map(({ menuConfig }) => objectPath.get(menuConfig, propertyPath));
