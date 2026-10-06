import { describe, expect, it } from 'vitest';
import getTemplateFilters from 'helpers/getTemplateFilters';

describe('getTemplateFilters', () => {
  it('picks only the docType and docTypeCourts fields', () => {
    expect(getTemplateFilters({ docType: 'a', docTypeCourts: 'b', other: 'c' })).toEqual({
      docType: 'a',
      docTypeCourts: 'b'
    });
  });
});
