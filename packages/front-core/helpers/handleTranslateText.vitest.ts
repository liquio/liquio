import { describe, expect, it } from 'vitest';
import handleTranslateText from 'helpers/handleTranslateText';

describe('handleTranslateText', () => {
  it('replaces a matching key inside the template with its translation', () => {
    const template = { title: 'Hello WELCOME_KEY' };
    const result = handleTranslateText([{ key: 'WELCOME_KEY', value: 'World' }], template);
    expect(result.title).toBe('Hello World');
  });

  it('returns the template unchanged when there are no translates', () => {
    const template = { title: 'unchanged' };
    expect(handleTranslateText(null, template)).toBe(template);
  });

  it('leaves the template unchanged when nothing matches', () => {
    const template = { title: 'no match here' };
    expect(handleTranslateText([{ key: 'MISSING_KEY', value: 'x' }], template)).toEqual(template);
  });
});
