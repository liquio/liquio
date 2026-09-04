import { hasUnquotedBrace } from './hasUnquotedBrace';

export const getAttributeKeyPositions = (controlKeyMap = [], jsonText) => {
  const lines = jsonText.split('\n');
  const results = [];
  const resultLines = new Set();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    controlKeyMap.forEach(({ control, key }) => {
      if (control && key) {
        const controlRegex = new RegExp(`"control"\\s*:\\s*"${control}"`);
        if (controlRegex.test(line)) {
          // Find enclosing object
          let braceCount = 0;
          let startLine = i;
          while (startLine >= 0 && !lines[startLine].includes('{')) startLine--;

          let j = startLine;
          while (j < lines.length && lines[j]) {
            if (hasUnquotedBrace(lines[j], '{')) braceCount++;
            if (hasUnquotedBrace(lines[j], '}')) braceCount--;

            const keyRegex = new RegExp(`"${key}"\\s*:`);

            const match = keyRegex.exec(lines[j]);
            if (match && !resultLines.has(j + 1)) {
              results.push({
                key,
                control,
                line: j + 1,
                start: match.index + 1,
                length: match[0].length
              });
              resultLines.add(j + 1);
            }

            j++;
            if (braceCount === 0) break;
          }
        }
      } else if (!control && key) {
        const keyRegex = new RegExp(`"${key}"\\s*:`);

        const match = keyRegex.exec(line);
        if (match && !resultLines.has(i + 1)) {
          resultLines.add(i + 1);
          results.push({
            key,
            control: null,
            line: i + 1,
            start: match.index + 1,
            length: match[0].length
          });
        }
      } else if (control && !key) {
        const controlRegex = new RegExp(`"control"\\s*:\\s*"${control}"`);
        const match = controlRegex.exec(line);

        if (match) {
          const valueRegex = new RegExp(`"${control}"`);
          const valueMatch = valueRegex.exec(line);

          if (valueMatch && !resultLines.has(i + 1)) {
            resultLines.add(i + 1);
            results.push({
              key: 'control',
              control,
              line: i + 1,
              start: valueMatch.index + 1,
              length: valueMatch[0].length + 1,
              isValue: true
            });
          }
        }
      }
    });
  }

  return results;
};
