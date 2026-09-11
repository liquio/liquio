import React from 'react';
import { translate } from 'react-translate';
import { parse } from 'node-html-parser';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Button, Dialog, DialogTitle, DialogContent } from '@mui/material';
import withStyles from '@mui/styles/withStyles';

import P7SFormRaw from 'components/P7SForm';
import renderHTML from 'helpers/renderHTML';
import edsService from 'services/eds';
import { setDecryptedData } from 'actions/messages';

const P7SForm = P7SFormRaw as unknown as React.ComponentType<Record<string, unknown>>;

const decryptedNodes = (node: { rawTagName?: string }) => !['WHENENCRYPTED'].includes(node.rawTagName as string);
const encryptedNodes = (node: { rawTagName?: string }) =>
  !['WHENDECRYPTED', 'ENCRYPTED'].includes(node.rawTagName as string);

interface MessageLike {
  id?: string | number;
  fullMessage?: string;
  decryptedToShow?: string;
  decryptedBase64?: unknown;
  isEncrypted?: boolean;
}

interface EncryptedMessageProps {
  t: (key: string) => string;
  actions?: { setDecryptedData: (messageId: string | number, base64Data: unknown) => Promise<unknown> };
  onUpdate?: () => void;
  message?: MessageLike;
}

const EncryptedMessage = ({
  t,
  actions = {} as EncryptedMessageProps['actions'],
  onUpdate,
  message: { id: messageId, fullMessage, decryptedToShow, decryptedBase64, isEncrypted } = {} as MessageLike
}: EncryptedMessageProps) => {
  const [open, setOpen] = React.useState(false);
  const [decryptedText, setDecryptedText] = React.useState('');

  React.useEffect(() => {
    if (isEncrypted || decryptedText) {
      return;
    }

    const updateDecryptedText = async () => {
      const signer = edsService.getFileKeySigner();
      try {
        const b64text = await signer.execute('Base64Decode', decryptedBase64);
        const result = await signer.execute('ArrayToString', b64text);
        setDecryptedText(result as string);
        onUpdate && onUpdate();
      } catch (e) {
        // nothing to do
      }
    };

    updateDecryptedText();
  }, [decryptedText, decryptedBase64, isEncrypted, onUpdate]);

  const root = parse(fullMessage || '');
  const enctypted = root.querySelector('ENCRYPTED');

  if (!isEncrypted) {
    return root.childNodes.filter(decryptedNodes as never).map((node) => {
      if ((node as { rawTagName?: string }).rawTagName && (node as { rawTagName?: string }).rawTagName === 'ENCRYPTED') {
        return renderHTML((decryptedToShow || decryptedText) + '<br/>');
      }

      return renderHTML((node as unknown as { rawText: string }).rawText + '<br/>');
    });
  }

  const onSelectKey = async (encryptedKey: unknown, signer: { execute: (...args: unknown[]) => Promise<unknown> }, resetPrivateKey: () => void) => {
    const decryptedData = await signer.execute('DevelopData', enctypted?.rawText);
    const base64Data = await signer.execute('Base64Encode', (decryptedData as { data?: unknown })?.data || decryptedData);

    await actions?.setDecryptedData(messageId as string | number, base64Data);
    setOpen(false);
    resetPrivateKey();
  };

  return (
    <>
      {root.childNodes.filter(encryptedNodes as never).map((node) => renderHTML((node as unknown as { rawText: string }).rawText + '<br/>'))}
      <Button color="primary" variant="contained" onClick={() => setOpen(true)}>
        {t('DecryptMessage')}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth={true}
        maxWidth={'sm'}
        scroll={'body'}
      >
        <DialogTitle>{t('DecryptionDialogTitle')}</DialogTitle>
        <DialogContent>
          <P7SForm
            onSelectKey={onSelectKey}
            onClose={() => setOpen(false)}
            readPrivateKeyText={t('DecryptMessage')}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

const mapDispatch = (dispatch: Dispatch) => ({
  actions: {
    setDecryptedData: bindActionCreators(setDecryptedData, dispatch)
  }
});

const styled = withStyles({})(EncryptedMessage as never);
const translated = translate('MessagePage')(styled as never);
export default connect(null, mapDispatch)(translated as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
