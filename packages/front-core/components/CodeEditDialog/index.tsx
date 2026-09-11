import React from 'react';
import { translate } from 'react-translate';
import withStyles from '@mui/styles/withStyles';

import FullScreenDialog from 'components/FullScreenDialog';
import CodeEditorRaw from 'components/CodeEditDialog/CodeEditor';

const CodeEditor = CodeEditorRaw as unknown as React.ComponentType<Record<string, unknown>>;

export const defaultHtml = (defaultHtmlValue?: boolean) =>
  defaultHtmlValue
    ? `<!DOCTYPE html>
<html lang="uk">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
    <style>
      body {
        font-size: 12px;
        margin: 0;
        font-family: 'e-Ukraine', Arial, Helvetica, sans-serif;
        line-height: 1;
        padding-right: 80px;
        padding-left: 80px;
        padding-top: 56px;
        padding-bottom: 56px;
        letter-spacing: -0.02em;
      }
    </style>
  </head>
  <body>

  </body>
</html>`
    : '';

const styles = () => ({
  dialog: {
    display: 'flex',
    '& .ace_editor': {
      flex: 1
    }
  }
});

interface MonacoEditorProps {
  open?: boolean;
  onClose?: () => void;
  description?: string;
  handleSaveButton?: () => React.ReactNode;
  [key: string]: unknown;
}

const MonacoEditor = ({
  open = false,
  onClose = () => null,
  description = '',
  handleSaveButton = () => null,
  ...props
}: MonacoEditorProps) => {
  return (
    <FullScreenDialog
      open={open}
      onClose={onClose}
      title={description}
      actions={handleSaveButton()}
    >
      <CodeEditor {...props} />
    </FullScreenDialog>
  );
};

const styled = withStyles(styles)(MonacoEditor as never);

export default translate('Elements')(styled as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
