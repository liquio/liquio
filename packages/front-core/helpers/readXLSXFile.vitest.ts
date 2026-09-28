import { describe, expect, it } from 'vitest';
import XLSX from 'xlsx';
import readXLSXFile from 'helpers/readXLSXFile';

describe('readXLSXFile', () => {
  it('reads a real workbook into a row array', async () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['a', 'b'],
      [1, 2]
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const file = new File([buffer], 'a.xlsx');

    expect(await readXLSXFile(file)).toEqual([
      ['a', 'b'],
      [1, 2]
    ]);
  });

  it('parses plain CSV-like content the same way (xlsx auto-detects the format)', async () => {
    const file = new File(['a,b\n1,2'], 'a.csv');
    expect(await readXLSXFile(file)).toEqual([
      ['a', 'b'],
      [1, 2]
    ]);
  });
});
