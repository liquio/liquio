import type { AuthUnit } from 'core/types/authState';
import { assertRecord, assertOptionalFields } from './contractValidation';

export function readBoolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new TypeError(`${label} must be boolean`);
  return value;
}

export function readToken(value: unknown): string | null {
  if (value !== null && typeof value !== 'string')
    throw new TypeError('Auth token must be a string or null');
  return value;
}

export function readRecord(value: unknown, label: string): Record<string, unknown> {
  assertRecord(value, label);
  return value;
}

function assertUnits(value: unknown): asserts value is AuthUnit[] {
  if (!Array.isArray(value)) throw new TypeError('Auth units must be an array or null');
  for (const unit of value) {
    assertRecord(unit, 'Auth unit');
    if (typeof unit.id !== 'number' || !Number.isFinite(unit.id) || typeof unit.name !== 'string') {
      throw new TypeError('Auth unit requires a numeric id and string name');
    }
    assertOptionalFields(unit, ['head', 'member'], 'boolean', 'Auth unit');
  }
}

export function readUnits(value: unknown): AuthUnit[] | null {
  if (value === null) return null;
  assertUnits(value);
  return value;
}
