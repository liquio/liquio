import { describe, expect, it } from 'vitest';
import formBuilder from 'helpers/formBuilder';

describe('formBuilder', () => {
  it('builds a hidden form with one input per param', () => {
    const form = formBuilder('/submit', 'post', { a: '1', b: '2' });
    expect(form.action).toContain('/submit');
    expect(form.method).toBe('post');
    const inputs = Array.from(form.querySelectorAll('input'));
    expect(inputs.map((i) => [i.name, i.value])).toEqual([
      ['a', '1'],
      ['b', '2']
    ]);
  });
});
