import type { AuthUser, LoginResponse } from 'core/types/auth';
import {
  assertOptionalFields,
  assertRecord,
  isRecord,
} from './contractValidation';

function assertMembership(
  value: unknown,
  type: 'string' | 'number',
  label: string,
): void {
  assertRecord(value, label);
  for (const group of ['all', 'head', 'member']) {
    const items = value[group];
    if (!Array.isArray(items) && !isRecord(items)) {
      throw new TypeError(`${label}.${group} must be an array or object`);
    }
    if (
      !Object.values(items).every(
        (item: unknown) =>
          typeof item === type &&
          (typeof item !== 'number' || Number.isFinite(item)),
      )
    ) {
      throw new TypeError(`${label}.${group} must contain ${type} values`);
    }
  }
}

function assertAuthUser(value: unknown): asserts value is AuthUser {
  assertRecord(value, 'Auth user');
  assertOptionalFields(
    value,
    [
      'userId',
      'firstName',
      'lastName',
      'middleName',
      'first_name',
      'last_name',
      'middle_name',
      'companyName',
      'email',
      'phone',
    ],
    'string',
    'Auth user',
    true,
  );
  assertOptionalFields(
    value,
    ['isLegal', 'isIndividualEntrepreneur'],
    'boolean',
    'Auth user',
    true,
  );
  // The backend's underscore-to-camelCase key conversion (lodash mapKeys) turns
  // array values into plain objects with stringified numeric keys, so these
  // fields can arrive as either shape on the wire — same tolerance as
  // assertMembership already applies to authUserUnits/authUserUnitIds below.
  for (const field of ['authUserRoles', 'courtIdUserScopes']) {
    const roles = value[field];
    if (roles === undefined) continue;
    if (!Array.isArray(roles) && !isRecord(roles)) {
      throw new TypeError(`Auth user.${field} must be an array or object`);
    }
    if (
      !Object.values(roles).every((role: unknown) => typeof role === 'string')
    ) {
      throw new TypeError(`Auth user.${field} must contain string values`);
    }
  }
  if (value.authUserUnits !== undefined)
    assertMembership(value.authUserUnits, 'string', 'Auth user.authUserUnits');
  if (value.authUserUnitIds !== undefined)
    assertMembership(
      value.authUserUnitIds,
      'number',
      'Auth user.authUserUnitIds',
    );
  if (value.valid !== undefined && value.valid !== null) {
    assertRecord(value.valid, 'Auth user.valid');
    assertOptionalFields(
      value.valid,
      ['email', 'phone'],
      'boolean',
      'Auth user.valid',
      true,
    );
  }
}

/** Preserve the reducer's legacy final-segment base64/UTF-8 format; this does not verify signatures. */
export function parseAuthUser(payload: unknown): AuthUser {
  let value: unknown = payload;
  if (typeof payload === 'string') {
    const encoded = payload.split('.').pop() ?? '';
    const bytes = window.atob(encoded);
    const utf8 = Array.from(
      bytes,
      (byte) => `%${byte.charCodeAt(0).toString(16).padStart(2, '0')}`,
    ).join('');
    value = JSON.parse(decodeURIComponent(utf8));
  }
  assertAuthUser(value);
  return value;
}

export function parseLoginResponse(value: unknown): LoginResponse {
  assertRecord(value, 'Login response');
  if (typeof value.token !== 'string' || !value.token.trim()) {
    throw new TypeError('Login response.token must be a non-empty string');
  }
  return { ...value, token: value.token };
}
