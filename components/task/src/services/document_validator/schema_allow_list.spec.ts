import { findPathsNotInSchema, getSchemaAllowListMode } from './schema_allow_list';

const schema = {
  properties: {
    step: {
      properties: {
        field: { type: 'string' },
        register: { control: 'register' },
        related: { properties: { region: { control: 'register' }, city: { control: 'register' } } },
        files: { control: 'select.files' },
        address: { control: 'address' },
        open: { properties: { a: { type: 'string' } }, additionalProperties: true },
        union: { properties: { a: { type: 'string' } }, oneOf: [{}] },
      },
    },
    arr: {
      type: 'array',
      items: { properties: { col: { type: 'string' } } },
    },
  },
};

describe('findPathsNotInSchema', () => {
  const find = (properties: any[], limit?: number) => findPathsNotInSchema(schema, properties, limit);

  describe('accepted', () => {
    it.each([
      ['declared path', [{ path: 'step.field', value: 'x' }]],
      ['whole step value', [{ path: 'step', value: { field: 'x' } }]],
      ['array item field', [{ path: 'arr.0.col', value: 'x' }]],
      ['whole array value', [{ path: 'arr', value: [{ col: 'a' }, { col: 'b' }] }]],
      ['register record', [{ path: 'step.register', value: { id: 1, data: { anyKey: 1 }, stringified: '{}' } }]],
      [
        'related register with options',
        [{ path: 'step.related', value: { region: { id: 1, data: { x: 1 } }, propertiesHasOptions: { city: false } } }],
      ],
      ['files array', [{ path: 'step.files', value: [{ id: 'f', name: 'n', meta: { a: 1 } }] }]],
      ['address nested object', [{ path: 'step.address', value: { a: { b: { c: 1 } } } }]],
      ['additionalProperties true', [{ path: 'step.open', value: { extra: 1 } }]],
      ['union node', [{ path: 'step.union', value: { extra: 1 } }]],
      ['delete of declared path', [{ path: 'step.field', value: undefined }]],
    ])('%s', (_name, properties) => {
      expect(find(properties)).toEqual([]);
    });
  });

  describe('rejected', () => {
    it('unknown step', () => {
      expect(find([{ path: 'unknownStep', value: { a: 1 } }])).toEqual(['unknownStep']);
    });

    it('unknown field', () => {
      expect(find([{ path: 'step.unknown', value: 1 }])).toEqual(['step.unknown']);
    });

    it('unknown nested key in value', () => {
      expect(find([{ path: 'step', value: { field: 1, extra: 2 } }])).toEqual(['step.extra']);
    });

    it('non-numeric array index', () => {
      expect(find([{ path: 'arr.x.col', value: 1 }])).toEqual(['arr.x']);
    });

    it('unknown key in array row value', () => {
      expect(find([{ path: 'arr.0', value: { col: 1, bad: 2 } }])).toEqual(['arr.0.bad']);
    });

    it('unknown key in whole array value', () => {
      expect(find([{ path: 'arr', value: [{ col: 1 }, { bad: 2 }] }])).toEqual(['arr.1.bad']);
    });

    it('__proto__ step', () => {
      expect(find([{ path: '__proto__', value: 1 }])).toEqual(['__proto__']);
    });

    it('inherited key is not declared', () => {
      expect(find([{ path: 'step.toString', value: 1 }])).toEqual(['step.toString']);
    });

    it('delete of unknown path', () => {
      expect(find([{ path: 'nope.x' }])).toEqual(['nope']);
    });

    it('limits the result', () => {
      const value = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`bad${i}`, 1]));
      expect(find([{ path: 'step', value }])).toHaveLength(10);
    });

    it('never returns values', () => {
      const result = find([{ path: 'step', value: { bad: 'SECRET-VALUE' } }]);
      expect(JSON.stringify(result)).not.toContain('SECRET-VALUE');
    });
  });
});

describe('getSchemaAllowListMode', () => {
  afterEach(() => {
    global.config = {};
  });

  it('defaults to enforce', () => {
    global.config = {};
    expect(getSchemaAllowListMode()).toBe('enforce');
  });

  it('falls back to enforce for unknown values', () => {
    global.config = { documents: { schemaAllowList: 'bogus' } };
    expect(getSchemaAllowListMode()).toBe('enforce');
  });

  it.each(['log', 'off'])('returns %s when configured', (mode) => {
    global.config = { documents: { schemaAllowList: mode } };
    expect(getSchemaAllowListMode()).toBe(mode);
  });
});
