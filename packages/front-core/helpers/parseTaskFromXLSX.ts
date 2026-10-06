/* eslint-disable no-case-declarations */
/* eslint-disable no-continue */
/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
import * as XLSX from 'xlsx';
import objectPath from 'object-path';
import cleanDeep from 'clean-deep';

interface ColumnDef {
  column: string;
  type?: 'number' | 'date' | string;
  objPath: string;
}

interface SheetDef {
  name: string;
  objPath: string;
  startRow: number;
  columns: ColumnDef[];
}

interface FileJson {
  sheets: SheetDef[];
}

function getRow(ws: XLSX.WorkSheet, sheet: SheetDef, index: number): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const cell in sheet.columns) {
    const val = ws[sheet.columns[cell].column + index];

    if (!val) continue;

    switch (sheet.columns[cell].type) {
      case 'number':
        objectPath.set(result, sheet.columns[cell].objPath, +val.v);
        break;
      case 'date': {
        const dateTmp = XLSX.SSF.parse_date_code(val.v);
        if (!dateTmp.y || !dateTmp.m || !dateTmp.d) {
          objectPath.set(result, sheet.columns[cell].objPath, val.v);
          break;
        }
        objectPath.set(result, sheet.columns[cell].objPath, new Date(dateTmp.y, dateTmp.m - 1, dateTmp.d).toLocaleDateString('uk-UK'));
        break;
      }
      default:
        objectPath.set(result, sheet.columns[cell].objPath, val.v);
        break;
    }
  }

  return result;
}

const readXlS = (f: Blob, fileJson: FileJson = { sheets: [] }): Promise<Record<string, unknown>> =>
  new Promise((resolve, reject) => {
    const result: Record<string, unknown> = {};

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      let wb: XLSX.WorkBook;

      try {
        wb = XLSX.read(bstr, { type: 'binary' });
      } catch (err) {
        return reject(err);
      }

      for (const sheet in fileJson.sheets) {
        const ws = wb.Sheets[fileJson.sheets[sheet].name];

        if (!ws) {
          continue;
        }

        const rows = +(ws['!ref'] as string).split(':')[1].match(/\d+/)![0];
        const shRes: Record<string, unknown>[] = [];

        for (let row = fileJson.sheets[sheet].startRow; row <= rows; row++) {
          const rowData = getRow(ws, fileJson.sheets[sheet], row);
          shRes.push(rowData);
        }

        objectPath.set(result, fileJson.sheets[sheet].objPath, cleanDeep(shRes));
      }

      resolve(result);
    };

    reader.readAsBinaryString(f);
  });

export default readXlS;
