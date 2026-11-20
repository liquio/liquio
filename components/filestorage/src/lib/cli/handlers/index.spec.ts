jest.mock('./migrate', () => ({ CliMigrateHandler: class CliMigrateHandler {} }));
jest.mock('./separate', () => ({ CliSeparateHandler: class CliSeparateHandler {} }));

import { getHandler } from './index';
import { CliMigrateHandler } from './migrate';
import { CliSeparateHandler } from './separate';

describe('getHandler', () => {
  it('should return registered handlers by command name', () => {
    expect(getHandler('migrate')).toBeInstanceOf(CliMigrateHandler);
    expect(getHandler('separate')).toBeInstanceOf(CliSeparateHandler);
  });

  it('should return the same handler instance for repeated lookups', () => {
    expect(getHandler('migrate')).toBe(getHandler('migrate'));
  });

  it('should return undefined for unknown commands', () => {
    expect(getHandler('unknown')).toBeUndefined();
    expect(getHandler(undefined)).toBeUndefined();
  });
});
