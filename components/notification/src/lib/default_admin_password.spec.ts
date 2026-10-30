import { isShippedDefaultAdminPassword, warnOnDefaultAdminPassword } from './default_admin_password';

// Built at runtime so the default is not spelled out as one literal in the code base.
const shippedDefault = ['secret', 'Password'].join('');

describe('default admin password check (NT-21)', () => {
  it('recognises the shipped default by hash', () => {
    expect(isShippedDefaultAdminPassword(shippedDefault)).toBe(true);
  });

  it.each([undefined, null, '', 'a-random-password', `${shippedDefault} `, 42])('does not flag %p', (value) => {
    expect(isShippedDefaultAdminPassword(value)).toBe(false);
  });

  it('warns once with a clear message and returns true for the default', () => {
    const log = { save: jest.fn() };
    expect(warnOnDefaultAdminPassword({ adminConfig: { password: shippedDefault } }, log)).toBe(true);
    expect(log.save).toHaveBeenCalledTimes(1);
    const [type, data, level] = log.save.mock.calls[0];
    expect(type).toBe('admin-default-password-warning');
    expect(level).toBe('warn');
    expect(data.message).toContain('shipped default');
    expect(JSON.stringify(data)).not.toContain(shippedDefault);
  });

  it('stays silent for a configured password or a missing one', () => {
    const log = { save: jest.fn() };
    expect(warnOnDefaultAdminPassword({ adminConfig: { password: 'x9' } }, log)).toBe(false);
    expect(warnOnDefaultAdminPassword({}, log)).toBe(false);
    expect(log.save).not.toHaveBeenCalled();
  });
});

describe('config template (NT-21)', () => {
  it('ships no working admin password', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { production } = require('../../../../config-templates/notification/config.json');
    expect(production.adminConfig.password).toBe('');
    expect(isShippedDefaultAdminPassword(production.adminConfig.password)).toBe(false);
  });
});
