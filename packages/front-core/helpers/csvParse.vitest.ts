import { describe, expect, it } from 'vitest';
import csvParse from 'helpers/csvParse';

describe('csvParse', () => {
  it('parses CSV content into rows', async () => {
    const rows = await csvParse('a,b\n1,2\n3,4', { headers: false });
    expect(rows).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4']
    ]);
  });

  it('respects a custom delimiter', async () => {
    const rows = await csvParse('a;b\n1;2', { headers: false, delimiter: ';' });
    expect(rows).toEqual([
      ['a', 'b'],
      ['1', '2']
    ]);
  });
});
