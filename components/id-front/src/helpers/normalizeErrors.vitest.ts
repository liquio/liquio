import { describe, expect, it } from 'vitest';

import normalizeErrors from 'helpers/normalizeErrors';

const t = (message: string) => `t(${message})`;

describe('normalizeErrors', () => {
  it('returns an empty object for undefined, null and empty errors', () => {
    expect(normalizeErrors(undefined, t)).toEqual({});
    expect(normalizeErrors(null, t)).toEqual({});
    expect(normalizeErrors([], t)).toEqual({});
  });

  it('maps a data path to a translated message', () => {
    expect(normalizeErrors([{ dataPath: '.email', message: 'invalid' }], t)).toEqual({ email: 't(invalid)' });
  });

  it('uses the missing property of a "required" error', () => {
    expect(normalizeErrors([{ params: { missingProperty: 'name' }, message: 'required' }], t)).toEqual({
      name: 't(required)',
    });
  });

  it('appends the missing property to the data path', () => {
    expect(
      normalizeErrors([{ dataPath: '.address', params: { missingProperty: 'city' }, message: 'required' }], t),
    ).toEqual({ address: { city: 't(required)' } });
  });

  it('converts array indexes and quoted keys in the path', () => {
    const result = normalizeErrors(
      [
        { dataPath: '.phones[0]', message: 'bad phone' },
        { dataPath: "['first name']", message: 'bad name' },
      ],
      t,
    );
    expect(result).toEqual({ phones: ['t(bad phone)'], "'first name'": 't(bad name)' });
  });

  it('collects several errors into one object', () => {
    const result = normalizeErrors(
      [
        { dataPath: '.a', message: 'one' },
        { dataPath: '.b.c', message: 'two' },
      ],
      t,
    );
    expect(result).toEqual({ a: 't(one)', b: { c: 't(two)' } });
  });

  it('lets a later error overwrite an earlier one on the same path', () => {
    const result = normalizeErrors(
      [
        { dataPath: '.a', message: 'one' },
        { dataPath: '.a', message: 'two' },
      ],
      t,
    );
    expect(result).toEqual({ a: 't(two)' });
  });
});
