import objectPath from 'object-path';
import { getConfig } from './configLoader';

interface Unit {
  id: number;
  head?: boolean;
  member?: boolean;
  menuConfig?: unknown;
  [key: string]: unknown;
}

interface UserInfo {
  authUserRoles?: Record<string, string> | string[];
  role?: string;
  edrpou?: unknown;
  [key: string]: unknown;
}

export default (required: Record<string, unknown> = {}, userInfo: UserInfo = {}, userUnits: Unit[] = []): unknown => {
  const config = getConfig();
  let hasAccess: unknown = false;

  Object.keys(required).forEach((prop) => {
    switch (prop) {
      case 'isUserUnitHead': {
        if (Array.isArray(required[prop])) {
          hasAccess = hasAccess || !!userUnits.find((unit) => (required[prop] as unknown[]).includes(unit.id) && unit.head);
        } else if (typeof required[prop] === 'boolean') {
          if (required[prop]) {
            hasAccess = hasAccess || userUnits.some((unit) => unit.head);
          } else {
            hasAccess = hasAccess || userUnits.every((unit) => !unit.head);
          }
        }
        break;
      }
      case 'userHasUnit': {
        const requiredUnits = ([] as unknown[]).concat(required[prop] as unknown);
        const hasRequiredUnit = userUnits.some(({ id }) => requiredUnits.includes(id));
        hasAccess = hasAccess || hasRequiredUnit;
        break;
      }
      case 'userDoesNotHaveUnit': {
        const requiredUnits = ([] as unknown[]).concat(required[prop] as unknown);
        const hasRequiredUnit = userUnits.some(({ id }) => {
          return requiredUnits.includes(id);
        });
        hasAccess = hasAccess || !hasRequiredUnit;
        break;
      }
      case 'userHasRole': {
        const { authUserRoles } = userInfo;
        hasAccess = hasAccess || Object.values(authUserRoles || {}).includes(required[prop] as string);
        break;
      }
      case 'isUnitedUser': {
        const unitLength = userUnits.length;
        hasAccess = hasAccess || (required[prop] ? unitLength > 0 : unitLength === 0);
        break;
      }
      case 'userIsAdmin': {
        const roles = (userInfo.role || '').split(';');
        const userHasAdminRole = roles.includes('admin');

        if (required[prop]) {
          hasAccess = hasAccess || userHasAdminRole;
        } else {
          hasAccess = hasAccess && !userHasAdminRole;
        }
        break;
      }
      case 'userIsGod': {
        const { godUnits = [] } = config as { godUnits?: number[] };

        const userHasGodUnits = (userUnits || []).some(({ id }) => (godUnits || []).includes(id));
        if (required[prop]) {
          hasAccess = hasAccess || userHasGodUnits;
        } else {
          hasAccess = hasAccess && !userHasGodUnits;
        }
        break;
      }
      case 'unitHasAccessTo': {
        userUnits.forEach((unit) => {
          const requiredUnits = ([] as unknown[]).concat(required[prop] as unknown);
          hasAccess = hasAccess || requiredUnits.some((need) => objectPath.get(unit.menuConfig, need as string));
        });
        break;
      }
      case 'affiliateUnits': {
        const requiredUnits = ([] as unknown[]).concat(required[prop] as unknown);
        const hasRequiredUnit = userUnits.some((unit) => unit.head && requiredUnits.includes(unit.id));
        hasAccess = hasAccess || hasRequiredUnit;
        break;
      }
      case 'userHasUnitNotHead': {
        const requiredUnits = ([] as unknown[]).concat(required[prop] as unknown);

        const hasRequiredUnit = userUnits.find(({ id }) => requiredUnits.includes(id));

        const hasRequiredUnitMember = hasRequiredUnit && hasRequiredUnit.member;
        const hasRequiredUnitHead = hasRequiredUnit && hasRequiredUnit.head;

        let result = false;

        if (hasRequiredUnitMember && hasRequiredUnitHead) result = true;

        if (hasRequiredUnitMember && !hasRequiredUnitHead) result = true;

        if (!hasRequiredUnitMember && hasRequiredUnitHead) result = false;

        hasAccess = hasAccess || result;

        break;
      }
      case 'isEnabled': {
        const result = required[prop];
        hasAccess = hasAccess || result;
        break;
      }
      case 'hideForUnitsHead': {
        const requiredUnits = ([] as unknown[]).concat(required[prop] as unknown);
        const hasRequiredUnit = userUnits.some((unit) => unit.head && requiredUnits.includes(unit.id));
        hasAccess = hasAccess && !hasRequiredUnit;
        break;
      }
      case 'hideForUnit': {
        const requiredUnits = ([] as unknown[]).concat(required[prop] as unknown);
        const hasRequiredUnit = userUnits.some((unit) => requiredUnits.includes(unit.id));
        hasAccess = hasAccess && !hasRequiredUnit;
        break;
      }
      case 'isLegalUser': {
        hasAccess = userInfo?.edrpou;
        break;
      }
      default:
        break;
    }
  });

  return hasAccess;
};
