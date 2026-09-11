import React from 'react';

const regex = /"(.+)": +"(.+)"/;

const functionRegexList = {
  'javascript': [
    /\((.+)?\)|.+=>.+/,
    /function\s*\w*\s*\(.*\)\s*{.*}/,
    /function\s*\w*\s*=>\s*{.*}/,
  ],
  'html': [
    /<\/?[a-z][\s\S]*>/i,
    /<\w+.*?>.*?<\/\w+>/,
  ]
};

const useSelection = (aceRef) => {
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

    aceRef.editor.getSession().on('changeScrollTop', () => setCursorPosition());
  }, [aceRef]);

  React.useEffect(() => {
    if (!column || !row || !aceRef?.editor) {
      return;
    }

    const line = aceRef.editor.getSession().getDocument().getLine(row);

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

      const { scrollTop } = aceRef.editor.renderer;
      const { top, left } =
        aceRef.editor.renderer.$cursorLayer.getPixelPosition({ row, column });

      setCursorPosition({ top: top - scrollTop, left });
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
        const lines = aceRef.editor.getSession().getDocument().getAllLines();

        const [, funcName, func] = lines[functionRow].match(regex);

        const lang = Object.keys(functionRegexList).find((lang) => 
          functionRegexList[lang].some((regex) => regex.test(func))
        );

        if (!lang || funcName !== functionName) {
          throw new Error();
        }

        lines[functionRow] = lines[functionRow].replace(
          func,
          changedFunctionBody.replace(/"/g, '\\"'),
        );
        aceRef.editor.session.setValue(lines.join('\n'));
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

export default useSelection;
