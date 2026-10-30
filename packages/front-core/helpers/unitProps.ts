import objectPath from 'object-path';

interface UserUnit {
  menuConfig?: unknown;
  [key: string]: unknown;
}

export default (propertyPath: string | Array<string | number>, userUnits: UserUnit[]): unknown[] =>
  userUnits.map(({ menuConfig }) => objectPath.get(menuConfig, propertyPath));
