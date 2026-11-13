import { describe, expect, it } from 'vitest';
import { parseTemplate, strignifyTemplate } from 'helpers/searchTemplate';

describe('parseTemplate', () => {
  it('splits required, optional, and excluded terms', () => {
    expect(parseTemplate('+must -not maybe')).toEqual({ all: ['must'], any: ['maybe'], noOne: ['not'] });
  });
});

describe('strignifyTemplate', () => {
  it('re-serializes a parsed template', () => {
    expect(strignifyTemplate({ all: ['must'], any: ['maybe'], noOne: ['not'] })).toBe('+must maybe -not');
  });
});
