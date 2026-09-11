import React from 'react';
import { translate } from 'react-translate';
import { TextField } from '@mui/material';
import SplitPane from 'react-split-pane';
import withStyles from '@mui/styles/withStyles';

import Editor from 'components/Editor';
import P7SForm from 'components/P7SForm';

import useStickyState from 'helpers/useStickyState';
import edsService from 'services/eds';
import Signer from 'services/eds/signer';

const SplitPaneAny = SplitPane as unknown as React.ComponentType<Record<string, unknown>>;

const styles = {
  editorsWrapper: {
    display: 'flex',
    height: '100%',
    flexDirection: 'column' as const,
  },
  textField: {
    marginTop: 16,
  },
  edsWrapper: {
    padding: 16,
  },
};

interface EDSFormTestProps {
  t: (key: string) => string;
  classes: Record<string, string>;
}

const EDSFormTest = ({ t, classes }: EDSFormTestProps) => {
  const [data, setData] = useStickyState('test', 'EDSFormTest-data');
  const [result, setResult] = React.useState<unknown>('');

  return (
    <SplitPaneAny split="vertical" minSize="50%">
      <div className={classes.edsWrapper}>
        <P7SForm
          getDataToSign={() => [
            {
              data,
              name: 'test',
              internal: true,
            },
          ]}
          onSignHash={async (signature: unknown) => {
            const signer = edsService.getFileKeySigner();
            const b64Signature = await signer.execute(
              'Base64Decode',
              signature,
            );
            const internalSignature = await signer.execute(
              'HashToInternal',
              b64Signature,
              data,
            );
            setResult(internalSignature);
          }}
          onSelectKey={async (encryptedKey: unknown, signer: Signer) => {
            const res = await signer.execute('SignData', data, true);
            setResult(res);
          }}
        />
        <TextField
          variant="outlined"
          label={t('CheckSignData')}
          rows={5}
          multiline={true}
          value={data}
          onChange={({ target: { value } }: { target: { value: string } }) => setData(value)}
          className={classes.textField}
        />
      </div>
      <div className={classes.editorsWrapper}>
        <Editor
          language="json"
          value={JSON.stringify(data, null, 4)}
          readOnly={true}
          width="100%"
          height="50%"
        />
        <Editor
          language="json"
          value={result as string | undefined}
          readOnly={true}
          width="100%"
          height="50%"
        />
      </div>
    </SplitPaneAny>
  );
};

const styled = withStyles(styles)(EDSFormTest as never);

export default translate('DebugTools')(styled as never) as unknown as React.ComponentType<Record<string, unknown>>;
