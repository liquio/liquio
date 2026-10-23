import { canSearchField, canSearchString } from './record_search_access';

const key = (schema = {}) => ({ id: 1, schema }) as any;

describe('RG-07: search predicates cannot reveal projected fields', () => {
  it.each(['public', 'profile.name', 'list.0.name'])('allows an unrestricted path %s', (path) => {
    expect(canSearchField(key(), path, [])).toBe(true);
  });
  it.each(['__proto__.name', 'profile.constructor', 'prototype', 'public::text', 'a..b'])('rejects unsafe path %s', (path) => {
    expect(canSearchField(key(), path, [])).toBe(false);
  });
  it('requires a server token for a protected column and its descendants', () => {
    const policy = key({ properties: { profile: { allowTokens: ['private'] } } });
    expect(canSearchField(policy, 'profile.name', [])).toBe(false);
    expect(canSearchField(policy, 'profile.name', ['private'])).toBe(true);
  });
  it('rejects partially visible objects and hidden descendants', () => {
    const policy = key({ responseFields: ['public', 'profile.name', 'list.*.name'] });
    expect(canSearchField(policy, 'profile', [])).toBe(false);
    expect(canSearchField(policy, 'profile.secret', [])).toBe(false);
    expect(canSearchField(policy, 'profile.name', [])).toBe(true);
    expect(canSearchField(policy, 'list.0', [])).toBe(false);
    expect(canSearchField(policy, 'list.0.name', [])).toBe(true);
  });
  it.each(['profile', 'profile.*', 'profile.**', '**'])('allows an entirely projected subtree through %s', (rule) => {
    expect(canSearchField(key({ responseFields: [rule] }), 'profile', [])).toBe(true);
  });
  it('matches the entity rules when a broad rule is combined with a narrow rule', () => {
    const policy = key({ responseFields: ['profile', 'profile.name'] });
    expect(canSearchField(policy, 'profile', [])).toBe(false);
    expect(canSearchField(policy, 'profile.name', [])).toBe(true);
  });
  it('denies derived search when any column is hidden', () => {
    const policy = key({ properties: { secret: { allowTokens: ['private'] } } });
    expect(canSearchString(policy, [])).toBe(false);
    expect(canSearchString(policy, ['private'])).toBe(true);
  });
  it.each([[], ['public'], ['*', 'profile.name']].map((rules) => [rules]))('denies derived search under responseFields %j', (rules) => {
    expect(canSearchString(key({ responseFields: rules }), [])).toBe(false);
  });
  it.each([undefined, ['*'], ['**'], ['*', 'public']].map((rules) => [rules]))('permits derived search with complete projection %j', (rules) => {
    expect(canSearchString(key({ responseFields: rules }), [])).toBe(true);
  });
  it.each([{ properties: { secret: { allowTokens: 'private' } } }, { responseFields: 'public' }])('fails closed on malformed policy %j', (schema) => {
    expect(() => canSearchString(key(schema), [])).toThrow();
    expect(() => canSearchField(key(schema), 'secret', [])).toThrow();
  });
});
