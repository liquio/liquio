/* eslint-disable @typescript-eslint/no-explicit-any */
import objectPath from 'object-path';
import { getConfig } from 'core/helpers/configLoader';

export default (required: Record<string, any> = {}, userInfo: Record<string, any> = {}, userUnits: any[] = []): boolean => {
  const config = getConfig();

  if (!Object.keys(required).length) {
    return true;
  }

  let hasAccess = false;

  Object.keys(required).forEach((prop) => {
    switch (prop) {
      case 'isUserUnitHead': {
        if (Array.isArray(required[prop])) {
          hasAccess =
          hasAccess ||
            !!userUnits.find((unit: any) => required[prop].includes(unit.id) && unit.head);
        } else if (typeof required[prop] === 'boolean') {
          if (required[prop]) {
            hasAccess = hasAccess || userUnits.some((unit: any) => unit.head);
          } else {
            hasAccess = hasAccess || userUnits.every((unit: any) => !unit.head);
          }
        }
        break;
      }
      case 'userHasUnit': {
        const requiredUnits: any[] = ([] as any[]).concat(required[prop]);
        const hasRequiredUnit = userUnits.some(({ id }: any) => requiredUnits.includes(id));
        hasAccess = hasAccess || hasRequiredUnit;
        break;
      }
      case 'userDoesNotHaveUnit': {
        const requiredUnits: any[] = ([] as any[]).concat(required[prop]);
        const hasRequiredUnit = userUnits.some(({ id }: any) => {
          return requiredUnits.includes(id);
        });
        hasAccess = hasAccess || !hasRequiredUnit;
        break;
      }
      case 'userHasRole': {
        const { authUserRoles } = userInfo;
        hasAccess = hasAccess || Object.values(authUserRoles).includes(required[prop]);
        break;
      }
      case 'isUnitedUser': {
        const unitLength = userUnits.length;
        hasAccess = hasAccess || (required[prop] ? unitLength > 0 : unitLength === 0);
        break;
      }
      case 'userIsAdmin': {
        const roles = userInfo.role.split(';');
        const userHasAdminRole = roles.includes('admin');

        if (required[prop]) {
          hasAccess = hasAccess || userHasAdminRole;
        } else {
          hasAccess = hasAccess && !userHasAdminRole;
        }
        break;
      }
      case 'userIsGod': {
        const godUnits = (config.godUnits || []) as any[];

        const userHasGodUnits = (userUnits || []).some(({ id }: any) => (godUnits || []).includes(id));
        if (required[prop]) {
          hasAccess = hasAccess || userHasGodUnits;
        } else {
          hasAccess = hasAccess && !userHasGodUnits;
        }
        break;
      }
      case 'unitHasAccessTo': {
        userUnits.forEach((unit: any) => {
          const requiredUnits: any[] = ([] as any[]).concat(required[prop]);
          hasAccess =
            hasAccess || requiredUnits.some((need: any) => objectPath.get(unit.menuConfig, need));
        });
        break;
      }
      case 'affiliateUnits': {
        const requiredUnits: any[] = ([] as any[]).concat(required[prop]);
        const hasRequiredUnit = userUnits.some(
          (unit: any) => unit.head && requiredUnits.includes(unit.id)
        );
        hasAccess = hasAccess || hasRequiredUnit;
        break;
      }
      case 'userHasUnitNotHead': {
        const requiredUnits: any[] = ([] as any[]).concat(required[prop]);

        const hasRequiredUnit = userUnits.find(({ id }: any) => requiredUnits.includes(id));

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
        const requiredUnits: any[] = ([] as any[]).concat(required[prop]);
        const hasRequiredUnit = userUnits.some(
          (unit: any) => unit.head && requiredUnits.includes(unit.id)
        );
        hasAccess = hasAccess && !hasRequiredUnit;
        break;
      }
      case 'hideForUnit': {
        const requiredUnits: any[] = ([] as any[]).concat(required[prop]);
        const hasRequiredUnit = userUnits.some((unit: any) => requiredUnits.includes(unit.id));
        hasAccess = hasAccess && !hasRequiredUnit;
        break;
      }
      case 'isLegalUser': {
        hasAccess = Boolean(userInfo?.edrpou);
        break;
      }
      default:
        break;
    }
  });

  return hasAccess;
};
