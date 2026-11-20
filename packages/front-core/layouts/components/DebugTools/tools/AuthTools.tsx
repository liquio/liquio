import React from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { TextField } from '@mui/material';
import Editor from 'components/Editor';

interface AuthToolsProps {
  t: (key: string) => string;
  auth: { token?: string; info?: unknown };
}

const AuthTools = ({ t, auth }: AuthToolsProps) => (
  <>
    <TextField
      variant="outlined"
      label={t('Token')}
      value={auth.token}
      fullWidth={true}
      InputProps={{
        readOnly: true,
      }}
      style={{
        maxWidth: window.innerWidth - 32,
        margin: 16,
      }}
    />
    <Editor
      language="json"
      value={JSON.stringify(auth.info, null, 4)}
      readOnly={true}
      width="100%"
      height="calc(100% - 48px)"
    />
  </>
);

const mapStateToProps = ({ auth }: { auth: { token?: string; info?: unknown } }) => ({
  auth,
});

const translated = translate('DebugTools')(AuthTools as never);
export default connect(mapStateToProps)(translated as never) as unknown as React.ComponentType<Record<string, unknown>>;
