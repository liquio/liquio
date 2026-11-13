import { describe, expect, it } from 'vitest';
import XLSX from 'xlsx';
import parseTaskFromXLSX from 'helpers/parseTaskFromXLSX';

describe('parseTaskFromXLSX', () => {
  it('extracts columns into objects by objPath, using the configured sheet layout', async () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Name', 'Age'],
      ['Alice', 30],
      ['Bob', 25]
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'People');
    // Use array (raw bytes) rather than binary (a JS string) so the Blob/File constructor
    // doesn't mangle the bytes via text encoding before FileReader.readAsBinaryString reads them back.
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const file = new File([buffer], 'a.xlsx');

    const result = await parseTaskFromXLSX(file, {
      sheets: [
        {
          name: 'People',
          objPath: 'people',
          startRow: 2,
          columns: [
            { column: 'A', objPath: 'name' },
            { column: 'B', objPath: 'age', type: 'number' }
          ]
        }
      ]
    });

    expect(result.people).toEqual([
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 }
    ]);
  });
});
