import { useState } from 'react';
import { makeStyles } from '@mui/styles';
import { IconButton } from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';
import SaveIcon from '@mui/icons-material/Save';
import { html as prettifyHtml } from 'js-beautify';

import FullScreenDialog from 'components/FullScreenDialog';
import RichTextEditor from 'components/RichTextEditor';
import Editor from 'components/Editor';
import { minifyHtml } from '../helpers/minifyHtml';

const useStyles = makeStyles({
  wrapper: {
    display: 'flex',
    flexDirection: 'row',
    height: '100%',
  },
  panel: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  button: {
    color: '#ffffff',
  },
});

const prettify = (value) => {
  return prettifyHtml(value, {
    indent_size: 2,
    preserve_newlines: true,
    indent_handlebars: true,
    wrap_line_length: 120,
  });
};

export const HtmlEditor = ({ value, handleSave }) => {
  const classes = useStyles();
  const [lastEditor, setLastEditor] = useState();
  const [open, setOpen] = useState(false);
  const [htmlValue, setHtmlValue] = useState(prettify(value));

  return (
    <>
      <IconButton
        size="large"
        className={classes.button}
        onClick={() => setOpen(!open)}
      >
        <CodeIcon />
      </IconButton>
      <FullScreenDialog
        open={open}
        title={'html'}
        onClose={() => setOpen(false)}
        actions={
          <IconButton
            size="large"
            className={classes.button}
            onClick={() => {
              handleSave(minifyHtml(htmlValue));
              setOpen(false);
            }}
          >
            <SaveIcon />
          </IconButton>
        }
      >
        <div className={classes.wrapper}>
          <div className={classes.panel}>
            <Editor
              width="100%"
              onChange={(newValue) => {
                setLastEditor('monaco');
                setHtmlValue(newValue);
              }}
              language="html"
              value={htmlValue}
            />
          </div>
          <div className={classes.panel}>
            <RichTextEditor
              readOnly={true}
              value={htmlValue}
              onChange={(newValue) => {
                setLastEditor('html');
                if (lastEditor === 'monaco') {
                  return;
                }
                setHtmlValue(newValue);
              }}
            />
          </div>
        </div>
      </FullScreenDialog>
    </>
  );
};
