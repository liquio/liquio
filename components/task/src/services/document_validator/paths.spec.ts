import { Paths } from './paths';

describe('Paths.matchesTemplate', () => {
  test('matches an identical plain path', () => {
    expect(Paths.matchesTemplate('step1.fieldB', 'step1.fieldB')).toBe(true);
  });

  test('does not match a different plain path', () => {
    expect(Paths.matchesTemplate('step1.fieldB', 'step1.fieldC')).toBe(false);
  });

  test('matches a `${index}` segment against a numeric segment', () => {
    expect(Paths.matchesTemplate('step1.items.${index}.result', 'step1.items.2.result')).toBe(true);
  });

  test('matches a `${index}` segment against a multi-digit numeric segment', () => {
    expect(Paths.matchesTemplate('step1.items.${index}.result', 'step1.items.12.result')).toBe(true);
  });

  test('does not match a `${index}` segment against a non-numeric segment', () => {
    expect(Paths.matchesTemplate('step1.items.${index}.result', 'step1.items.first.result')).toBe(false);
  });

  test('does not match a path with more segments than the template', () => {
    expect(Paths.matchesTemplate('step1.result', 'step1.result.name')).toBe(false);
  });

  test('does not match a path with fewer segments than the template', () => {
    expect(Paths.matchesTemplate('step1.result', 'step1')).toBe(false);
  });

  test('does not match a sibling path sharing the template as a prefix', () => {
    expect(Paths.matchesTemplate('t.obj', 't.objX')).toBe(false);
  });

  test('does not match when the template is not a string', () => {
    expect(Paths.matchesTemplate(['step1.fieldB'], 'step1.fieldB')).toBe(false);
  });

  test('does not match when the path is not a string', () => {
    expect(Paths.matchesTemplate('step1.fieldB', undefined)).toBe(false);
  });
});

describe('Paths.matchesTemplateOrDescendant', () => {
  test('matches the template path itself', () => {
    expect(Paths.matchesTemplateOrDescendant('calc.result', 'calc.result')).toBe(true);
  });

  test('matches a leaf sub-path of an object target', () => {
    expect(Paths.matchesTemplateOrDescendant('calc.result', 'calc.result.name')).toBe(true);
  });

  test('matches an item path of an array target', () => {
    expect(Paths.matchesTemplateOrDescendant('calc.result', 'calc.result.2')).toBe(true);
  });

  test('matches a deeply nested path under the target', () => {
    expect(Paths.matchesTemplateOrDescendant('calc.result', 'calc.result.2.name')).toBe(true);
  });

  test('does not match a parent of the target', () => {
    expect(Paths.matchesTemplateOrDescendant('calc.result', 'calc')).toBe(false);
  });

  test('does not match a sibling path sharing the target as a prefix', () => {
    expect(Paths.matchesTemplateOrDescendant('t.obj', 't.objX')).toBe(false);
  });

  test('does not match a path under a sibling sharing the target as a prefix', () => {
    expect(Paths.matchesTemplateOrDescendant('t.obj', 't.objX.name')).toBe(false);
  });

  test('matches a `${index}` template against a concrete item path', () => {
    expect(Paths.matchesTemplateOrDescendant('a.${index}.result', 'a.0.result')).toBe(true);
  });

  test('matches a `${index}` template against a path under the concrete item target', () => {
    expect(Paths.matchesTemplateOrDescendant('a.${index}.result', 'a.3.result.name')).toBe(true);
  });

  test('does not match a `${index}` template against a non-numeric segment', () => {
    expect(Paths.matchesTemplateOrDescendant('a.${index}.result', 'a.x.result.name')).toBe(false);
  });

  test('does not match a `${index}` template against the array item itself', () => {
    expect(Paths.matchesTemplateOrDescendant('a.${index}.result', 'a.0')).toBe(false);
  });

  test('does not match when the template is not a string', () => {
    expect(Paths.matchesTemplateOrDescendant(['calc.result'], 'calc.result.name')).toBe(false);
  });

  test('does not match when the path is not a string', () => {
    expect(Paths.matchesTemplateOrDescendant('calc.result', null)).toBe(false);
  });
});

describe('Paths.isSameOrDescendantPath', () => {
  test('is true for the same path', () => {
    expect(Paths.isSameOrDescendantPath('calc.result', 'calc.result')).toBe(true);
  });

  test('is true for a path under the ancestor', () => {
    expect(Paths.isSameOrDescendantPath('calc.result.name', 'calc.result')).toBe(true);
  });

  test('is false for a parent of the other path', () => {
    expect(Paths.isSameOrDescendantPath('calc', 'calc.result')).toBe(false);
  });

  test('is false for a sibling sharing the other path as a prefix', () => {
    expect(Paths.isSameOrDescendantPath('t.objX', 't.obj')).toBe(false);
  });
});
