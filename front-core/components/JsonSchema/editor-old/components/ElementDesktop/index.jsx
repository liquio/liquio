import React from 'react';
import { useTranslate } from 'react-translate';
import { IconButton, Tooltip, Typography } from '@mui/material';
import { makeStyles } from '@mui/styles';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import SettingsIcon from '@mui/icons-material/Settings';
import { withEditor } from 'components/JsonSchema/editor/JsonSchemaProvider';
import VisualEditor from './components/VisualEditor';
import CodeEditor from './components/CodeEditor';
import editorSettingsSchema from './constants/editorSettingsSchema.json'

import { UserSettingsButton } from '../../../../UserSettings';

const editors = {
  VisualEditor,
  CodeEditor,
};

const withStyles = makeStyles(() => ({
  root: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  actions: {
    position: 'absolute',
    top: 4,
    right: 100,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 0,
  },
  action: {
    display: 'flex',
    alignItems: 'center',
  },
  json5: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
}));

const ElementDesktop = ({ readOnly }) => {
  const t = useTranslate('JsonSchemaEditor');
  const classes = withStyles();
  const [active, setActive] = React.useState(1);

  const Editor = Object.values(editors)[active];

  return (
    <>
      <div className={classes.actions}>
        <div className={classes.action}>
          <UserSettingsButton
            part="editor"
            title={t('EditorSettings')}
            icon={<SettingsIcon />}
            schema={editorSettingsSchema}
            defaults={{
              controlHintsEnabled: true,
              copilot: {
                enabled: true,
                model: 'liquio-copilot',
              }
            }}
          />
        </div>
        <div className={classes.action}>
          <Tooltip title={t('ChangeEditor')}>
            <IconButton onClick={() => setActive(active === 1 ? 0 : 1)}>
              {active === 1 ? (
                <AccountTreeIcon />
              ) : (
                <Typography className={classes.json5}>{'json5'}</Typography>
              )}
            </IconButton>
          </Tooltip>
        </div>
      </div>
      <div className={classes.root}>
        <Editor readOnly={readOnly} />
      </div>
    </>
  );
};

export default withEditor(ElementDesktop);
