import React from 'react';

const regex = /"(.+)": +"(.+)"/;

const functionRegexList = {
  'javascript': [
    /\((.+)?\)(.+)?=>.+/,
    /function\s*\w*\s*\(.*\)\s*{.*}/,
    /function\s*\w*\s*=>\s*{.*}/,
  ],
  'html': [
    /<\/?[a-z][\s\S]*>/i,
    /<\w+.*?>.*?<\/\w+>/,
    /<\s*(\w+)(?:\s+[^>]*)?>\s*<\s*\w+(?:\s+[^>]*)?>((?:.|\n)*?{{[^}]+}}(?:.|\n)*?)<\/\s*\w+>\s*<\/\s*\1>/,
  ],
};

const useSelectionMonacoEditor = (aceRef) => {
  const [row, setRow] = React.useState();
  const [column, setColumn] = React.useState();
  const [language, setLanguage] = React.useState();
  const [functionBody, setFunctionBody] = React.useState();
  const [functionName, setFunctionName] = React.useState();
  const [cursorPosition, setCursorPosition] = React.useState();
  const [editorScrollTop, setEditorScrollTop] = React.useState();

  React.useEffect(() => {
    if (!aceRef?.editor) {
      return;
    }

    if (editorScrollTop) {
      aceRef.editor.renderer.scrollTop = editorScrollTop;
      setEditorScrollTop();
    }
  }, [aceRef]);

  React.useEffect(() => {
    if (!column || !row || !aceRef?.getModel()) {
      return;
    }

    const model = aceRef.getModel();
    if (row < 1 || row > model.getLineCount()) {
      return;
    }

    const line = model.getLineContent(row);

    try {
      if (!regex.test(line)) {
        throw new Error();
      }

      const [, funcName, func] = line.match(regex);

      const lang = Object.keys(functionRegexList).find((lang) =>
        functionRegexList[lang].some((regex) => regex.test(func))
      );

      if (!lang) {
        throw new Error();
      }

      const { top, left } = aceRef.getScrolledVisiblePosition(
        aceRef.getPosition(),
      );

      setCursorPosition({ top, left });
      setLanguage(lang);
      setFunctionBody(func);
      setFunctionName(funcName);
    } catch (e) {
      setLanguage();
      setFunctionBody();
      setFunctionName();
    }
  }, [column, row, aceRef]);

  const saveEditorScrollTop = React.useCallback(() => {
    setEditorScrollTop(aceRef.editor?.renderer.scrollTop);
  }, [aceRef]);

  const onFunctionChange = React.useCallback(
    ({ functionRow, functionName, functionBody: changedFunctionBody }) => {
      try {
        const model = aceRef.getModel();

        if (!model) {
          throw new Error();
        }

        if (functionRow < 1 || functionRow > model.getLineCount()) {
          return;
        }

        const line = model.getLineContent(functionRow);

        const [, funcName, func] = line.match(regex);

        const lang = Object.keys(functionRegexList).find((lang) =>
          functionRegexList[lang].some((regex) => regex.test(func))
        );

        if (!lang || funcName !== functionName) {
          throw new Error(
            `There is no key "${functionName}", which function has been edited in functionEditor.`
          );
        }

        const edit = {
          range: new monaco.Range(
            functionRow,
            1,
            functionRow,
            model.getLineMaxColumn(functionRow),
          ),
          text: line.replace(func, changedFunctionBody.replace(/"/g, '\\"')),
        };

        model.pushEditOperations([], [edit], () => null);
      } catch (e) {
        console.log(e);
      }
    },
    [aceRef],
  );

  return {
    language,
    functionName,
    cursorPosition,
    functionRow: row,
    onFunctionChange,
    saveEditorScrollTop,
    functionBody: functionBody && functionBody.replace(/\\"/g, '"'),
    setSelection: (selection) =>
      setTimeout(() => {
        const {
          anchor: { column: c, row: r },
        } = selection;
        setColumn(c);
        setRow(r);
      }, 50),
  };
};

export default useSelectionMonacoEditor;
