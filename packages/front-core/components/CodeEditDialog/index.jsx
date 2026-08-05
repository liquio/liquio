import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import withStyles from '@mui/styles/withStyles';

import FullScreenDialog from 'components/FullScreenDialog';
import CodeEditor from 'components/CodeEditDialog/CodeEditor';

export const defaultHtml = (defaultHtmlValue) =>
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

const MonacoEditor = ({ open, onClose, description, handleSaveButton, ...props }) => {
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

MonacoEditor.propTypes = {
  classes: PropTypes.object.isRequired,
  open: PropTypes.bool,
  onClose: PropTypes.func,
  onChange: PropTypes.func,
  onValidate: PropTypes.func,
  value: PropTypes.string,
  description: PropTypes.string,
  mode: PropTypes.string,
  schema: PropTypes.object,
  handleSave: PropTypes.func,
  handleSaveButton: PropTypes.func,
  readOnly: PropTypes.bool,
  defaultHtmlValue: PropTypes.bool
};

MonacoEditor.defaultProps = {
  open: false,
  onClose: () => null,
  onChange: () => null,
  onValidate: () => null,
  value: '',
  description: '',
  mode: 'json5',
  schema: null,
  handleSave: () => null,
  handleSaveButton: () => null,
  readOnly: false,
  defaultHtmlValue: true
};

const styled = withStyles(styles)(MonacoEditor);

export default translate('Elements')(styled);
