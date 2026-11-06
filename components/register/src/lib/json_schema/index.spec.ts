import { Sandbox } from '@liquio/back-core';

import JsonSchema from '.';

jest.mock('../../models/record');

describe('JsonSchema', () => {
  beforeAll(() => {
    new Sandbox({ getLog: () => ({ save: jest.fn() }) });
  });

  describe('customTypes', () => {
    it('should accept a value that passes a custom type', () => {
      const jsonSchema = new JsonSchema({
        type: 'object',
        customTypes: { isEven: '(value) => value % 2 === 0' },
        properties: { count: { type: 'number', isEven: true } },
      });
      expect(jsonSchema.validation({ count: 2 })).toBe(true);
    });

    it('should reject a value that fails a custom type', () => {
      const jsonSchema = new JsonSchema({
        type: 'object',
        customTypes: { isEven: '(value) => value % 2 === 0' },
        properties: { count: { type: 'number', isEven: true } },
      });
      expect(jsonSchema.validation({ count: 3 })).toBe(false);
    });

    it('should pass the keyword value and field schema to a custom type', () => {
      const jsonSchema = new JsonSchema({
        type: 'object',
        customTypes: { minLengthOf: '(value, min, field) => field.type === "string" && value.length >= min' },
        properties: { name: { type: 'string', minLengthOf: 3 } },
      });
      expect(jsonSchema.validation({ name: 'abcd' })).toBe(true);
      expect(jsonSchema.validation({ name: 'ab' })).toBe(false);
    });

    it('should remove customTypes from the compiled schema', () => {
      const jsonSchema = new JsonSchema({
        type: 'object',
        customTypes: { isEven: '(value) => value % 2 === 0' },
        properties: {},
      });
      expect(jsonSchema.schema.customTypes).toBeUndefined();
    });
  });
});
