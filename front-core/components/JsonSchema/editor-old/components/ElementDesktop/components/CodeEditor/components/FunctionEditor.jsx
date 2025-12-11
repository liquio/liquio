import React, { useState, useEffect } from 'react';
import { useTranslate } from 'react-translate';
import { makeStyles } from '@mui/styles';
import { Button, DialogActions, DialogTitle } from '@mui/material';

import CloseIcon from '@mui/icons-material/Close';

import { minify } from 'terser';
import beautify, { html as prettifyHtml } from 'js-beautify';
import { minifyHtml } from '../helpers/minifyHtml';

import Editor from 'components/Editor';

const useStyles = makeStyles({
  wrapper: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#141414',
  },
  title: {
    padding: '10px 10px 10px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    color: '#ffffff',
  },
  closeBtn: {
    color: '#ffffff',
  },
  actions: {
    marginBottom: 0,
  },
  dialogActionsWrapper: {
    marginTop: 7,
    marginBottom: 20,
  },
});

const minifyOptions = {
  parse: false,
  compress: false,
  mangle: false,
  ecma: 6,
  enclose: false,
  keep_classnames: true,
  keep_fnames: true,
  ie8: false,
  module: false,
  nameCache: null,
  safari10: false,
  toplevel: false,
  output: { quote_style: 1 },
};

const funcPrefix = 'const func=';

const FunctionEditor = ({
  language,
  functionBody,
  functionName,
  functionRow,
  onChange,
  onClose,
  readOnly,
}) => {
  const t = useTranslate('Elements');
  const classes = useStyles();
  const [editorValue, setEditorValue] = useState(functionBody);

  useEffect(() => {
    const formattedBody = language === 'html'
      ? prettifyHtml(functionBody, {
        indent_size: 2,
        preserve_newlines: true,
        indent_handlebars: true,
        wrap_line_length: 120,
      })
      : beautify(functionBody, { indent_size: 4 });

    setEditorValue(formattedBody);
  }, [functionBody, language]);

  const handleSave = async () => {
    if (language === 'html') {
      onChange({
        functionRow,
        functionName,
        functionBody: minifyHtml(editorValue),
      });

      onClose();
      return;
    }

    const argumentCheck = (value) => {
      const trimmedValue = value.trim();
      if (trimmedValue.startsWith('(')) {
        return trimmedValue;
      }
      const firstArrowIndex = trimmedValue.indexOf('=>');
      const firstPart = trimmedValue.substring(0, firstArrowIndex).trim();
      const secondPart = trimmedValue.substring(firstArrowIndex + 2).trim();
      const correctedArg = firstPart.startsWith('(')
        ? firstPart
        : `(${firstPart})`;

      return `${correctedArg} => ${secondPart}`;
    };

    try {
      const { code } = await minify(funcPrefix + editorValue, minifyOptions);
      const beautyfied = beautify(code);
      const minified = beautyfied
        .replace(funcPrefix, '')
        .replace('const func = ', '') // magic
        .replace(/(\r\n|\n|\r|\t)/gm, '')
        .replace(/ {4}/gm, '');

      const resultFunction = argumentCheck(minified);

      onChange({
        functionRow,
        functionName,
        functionBody: resultFunction,
      });

      onClose();
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <div className={classes.wrapper}>
      <DialogTitle className={classes.title}>
        {functionName}
        <Button className={classes.closeBtn} onClick={onClose}>
          <CloseIcon />
        </Button>
      </DialogTitle>
      <Editor
        height="90%"
        language={language}
        value={editorValue}
        options={{
          readOnly: readOnly,
        }}
        onChange={setEditorValue}
      />
      {!readOnly ? (
        <DialogActions className={classes.dialogActionsWrapper}>
          <Button className={classes.closeBtn} onClick={onClose}>
            {t('Close')}
          </Button>
          <Button color="primary" variant="contained" onClick={handleSave}>
            {t('Save')}
          </Button>
        </DialogActions>
      ) : null}
    </div>
  );
};

export default FunctionEditor;
