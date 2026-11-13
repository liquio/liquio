import { JsonSchemaNode } from '../../types';

interface ParsePasteOptions {
  start?: { j?: number };
}

export default ({ properties }: { properties: Record<string, JsonSchemaNode> }) =>
  (str: string, options?: ParsePasteOptions): unknown[][] => {
    return str.split(/\r\n|\n|\r/).map((row) => {
      const cells = row.split('\t');
      return cells.map((cell, index) => {
        if (!cell || typeof cell !== 'string') {
          return cell;
        }

        const start = options?.start?.j || 0;
        const property = Object.values(properties)[index + start];

        switch (property?.type) {
          case 'number': {
            const numberValue = Number(
              cell.replaceAll(',', '.').replaceAll(' ', ''),
            );
            if (isNaN(numberValue)) {
              return cell;
            }
            return numberValue;
          }
          case 'object': {
            try {
              return JSON.parse(cell);
            } catch {
              return cell;
            }
          }
          default:
            return cell;
        }
      });
    });
  };
