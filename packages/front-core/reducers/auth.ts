import type { AuthState, AuthUnit, StoreAction } from 'core/types/authState';
import { readBoolean, readToken, readRecord, readUnits } from 'core/helpers/authStateContracts';
import { parseAuthUser } from 'core/helpers/authContracts';
import { AUTH_SET_TOKEN, TOKEN_ERROR } from 'actions/auth';
import checkAuthPhoneValidation from 'helpers/checkAuthPhoneValidation';
import capitalizeFirstLetter from 'helpers/capitalizeFirstLetter';
import adminUnits from 'reducers/variables/adminUnits';
import { getConfig } from 'helpers/configLoader';

export const LOGOUT = 'LOGOUT';

export const REQUEST_USER_INFO_FAIL = 'REQUEST_USER_INFO_FAIL';
export const REQUEST_USER_INFO_SUCCESS = 'REQUEST_USER_INFO_SUCCESS';
export const REQUEST_UNITS_SUCCESS = 'REQUEST_UNITS_SUCCESS';
export const SET_USER_SETTINGS = 'SET_USER_SETTINGS';
export const REQUEST_USER_SETTINGS_SUCCESS = 'REQUEST_USER_SETTINGS_SUCCESS';
export const SEARCH_USER_SUCCESS = 'SEARCH_USER_SUCCESS';
export const UPDATE_USER_INFO = 'UPDATE_USER_INFO';

export const SET_USER_PHONE_VALID_SUCCESS = 'SET_USER_PHONE_VALID_SUCCESS';
export const REQUEST_AUTH_MODE_SUCCESS = 'REQUEST_AUTH_MODE_SUCCESS';

export const VERIFY_EMAIL_CODE_SUCCESS = 'VERIFY_EMAIL_CODE_SUCCESS';
export const VERIFY_SMS_CODE_SUCCESS = 'VERIFY_SMS_CODE_SUCCESS';

const TOGGLE_DEBUG_MODE = 'TOGGLE_DEBUG_MODE';
const adminMenus: Partial<Record<number, unknown>> = adminUnits;

export const initialState: AuthState = {
  token: null,
  info: null,
  useTwoFactorAuth: false,
  foundUser: null,
  tokenError: false,
  units: null,
  userUnits: null,
  debugMode: false,
};

const rootReducer = (state: AuthState = initialState, action: StoreAction): AuthState => {
  const config = getConfig();

  switch (action.type) {
    case AUTH_SET_TOKEN:
      return { ...state, token: readToken(action.payload), tokenError: false };
    case REQUEST_USER_INFO_SUCCESS: {
      const { units } = state;

      const userData = parseAuthUser(action.payload);

      const newState: AuthState = { ...state, info: userData };

      newState.firstName = capitalizeFirstLetter(newState.firstName || '');
      newState.lastName = capitalizeFirstLetter(newState.lastName || '');
      newState.middleName = capitalizeFirstLetter(newState.middleName || '');

      const { authUserUnits } = userData;

      if (config.showPhone) {
        checkAuthPhoneValidation(userData);
      }

      if (authUserUnits && units) {
        const authUserUnitsNames = Object.values(authUserUnits.all);
        newState.userUnits = (units || []).filter(({ name }) =>
          (authUserUnitsNames || []).includes(name),
        );
      }

      return newState;
    }
    case SET_USER_SETTINGS: {
      return { ...state, settings: readRecord(action.payload || {}, 'User settings') };
    }
    case REQUEST_USER_SETTINGS_SUCCESS: {
      return {
        ...state,
        settings: readRecord(
          readRecord(action.payload ?? {}, 'User settings response').data || {},
          'User settings',
        ),
      };
    }
    case REQUEST_UNITS_SUCCESS: {
      const units = readUnits(action.payload);
      const { info } = state;
      const { authUserUnits, authUserUnitIds } = info || {};

      let userUnits: AuthUnit[] = [];

      if (authUserUnits) {
        const authUserUnitsNames = Object.values(authUserUnits.all);
        const authUserHeadUnitsNames = Object.values(authUserUnits.head);
        const authUserMemberUnitsNames = Object.values(authUserUnits.member);

        userUnits = (units || [])
          .filter(({ name }) => (authUserUnitsNames || []).includes(name))
          .map((unit) => ({
            ...unit,
            head: authUserHeadUnitsNames.includes(unit.name),
            member: authUserMemberUnitsNames.includes(unit.name),
          }));
      }

      if (authUserUnitIds) {
        const authUserUnitsId = Object.values(authUserUnitIds.all);
        const authUserHeadUnitsId = Object.values(authUserUnitIds.head);
        userUnits = (units || [])
          .filter(({ id }) => (authUserUnitsId || []).includes(id))
          .map((unit) => ({
            ...unit,
            head: authUserHeadUnitsId.includes(unit.id),
          }))
          .map((unit) => {
            const { id } = unit;
            if (!Object.keys(adminUnits).includes((id || 0).toString())) return unit;
            return {
              ...unit,
              menuConfig: adminMenus[id],
            };
          });
      }

      return { ...state, userUnits, units };
    }
    case REQUEST_USER_INFO_FAIL:
      return initialState;
    case REQUEST_AUTH_MODE_SUCCESS:
      return {
        ...state,
        useTwoFactorAuth: readBoolean(
          readRecord(action.payload, 'Auth mode').useTwoFactorAuth,
          'useTwoFactorAuth',
        ),
      };
    case SEARCH_USER_SUCCESS: {
      const { users } = readRecord(action.payload, 'User search');
      if (!Array.isArray(users)) throw new TypeError('User search.users must be an array');
      return { ...state, foundUser: users.length ? parseAuthUser(users[0]) : undefined };
    }
    case UPDATE_USER_INFO:
    case SET_USER_PHONE_VALID_SUCCESS:
      return {
        ...state,
        info: parseAuthUser({ ...state.info, ...readRecord(action.payload, 'Profile update') }),
      };
    case VERIFY_EMAIL_CODE_SUCCESS: {
      const { info } = state;
      if (!info) return state;

      return {
        ...state,
        info: {
          ...info,
          valid: {
            ...info.valid,
            email: true,
          },
        },
      };
    }
    case LOGOUT:
      return { ...state, token: null, info: null };
    case TOKEN_ERROR:
      return { ...state, tokenError: readBoolean(action.payload, 'tokenError') };
    case TOGGLE_DEBUG_MODE:
      return { ...state, debugMode: !state.debugMode };
    default:
      return state;
  }
};

export default rootReducer;
