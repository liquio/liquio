import { useEffect } from 'react';
import { useMonaco } from '@monaco-editor/react';

const regex = /"(.+)": +"(.+)"/;

const functionRegexList = [
  /\((.+)?\)(.+)?=>.+/,
  /function\s*\w*\s*\(.*\)\s*{.*}/,
  /function\s*\w*\s*=>\s*{.*}/,
];

function replacePlaceholders(inputStr) {
  return inputStr.replace(/\[\$\{(.*?)\}\]/g, (match, p1) => `[xx${p1}x]`);
}

export const useJavascriptValidator = (editor) => {
  const monaco = useMonaco();

  useEffect(() => {
    if (!editor || !monaco) return;

    const validate = (value) => {
      let errors = [];
      const model = editor.getModel();
      const lines = replacePlaceholders(value).split('\n');

      lines.forEach((line, index) => {
        const match = line.match(regex);
        if (match) {
          const [, funcName, func] = match;

          if (functionRegexList.some((regex) => regex.test(func))) {
            try {
              new Function(JSON.parse(`"${func}"`));
            } catch (error) {
              const startPos = model.getPositionAt(
                model.getOffsetAt({ lineNumber: index + 1, column: line.indexOf(func) + 1 })
              );
              const endPos = model.getPositionAt(
                model.getOffsetAt({ lineNumber: index + 1, column: line.length })
              );

              errors.push({
                message: `Error in function "${funcName}": ${error.message}`,
                severity: monaco.MarkerSeverity.Error,
                startLineNumber: startPos.lineNumber,
                startColumn: startPos.column,
                endLineNumber: endPos.lineNumber,
                endColumn: endPos.column,
              });
            }
          }
        }
      });

      monaco.editor.setModelMarkers(model, 'custom-function-validation', errors);
    };

    let validationTimeout;
    editor.onDidChangeModelContent(() => {
      clearTimeout(validationTimeout);
      validationTimeout = setTimeout(() => {
        validate(editor.getValue());
      }, 500);
    });

    validate(editor.getValue());
  }, [editor, monaco]);
}
