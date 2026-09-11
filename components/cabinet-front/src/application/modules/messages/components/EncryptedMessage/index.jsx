import React from 'react';
import { translate } from 'react-translate';
import { parse } from 'node-html-parser';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Button, Dialog, DialogTitle, DialogContent } from '@mui/material';
import withStyles from '@mui/styles/withStyles';

import P7SForm from 'components/P7SForm';
import renderHTML from 'helpers/renderHTML';
import edsService from 'services/eds';
import { setDecryptedData } from 'actions/messages';

const decryptedNodes = (node) => !['WHENENCRYPTED'].includes(node.rawTagName);
const encryptedNodes = (node) => !['WHENDECRYPTED', 'ENCRYPTED'].includes(node.rawTagName);

const EncryptedMessage = ({
  t,
  actions = {},
  onUpdate,
  message: { id: messageId, fullMessage, decryptedToShow, decryptedBase64, isEncrypted } = {}
}) => {
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
        setDecryptedText(result);
        onUpdate && onUpdate();
      } catch (e) {
        // nothing to do
      }
    };

    updateDecryptedText();
  }, [decryptedText, decryptedBase64, isEncrypted, onUpdate]);

  const root = parse(fullMessage);
  const enctypted = root.querySelector('ENCRYPTED');

  if (!isEncrypted) {
    return root.childNodes.filter(decryptedNodes).map((node) => {
      if (node.rawTagName && node.rawTagName === 'ENCRYPTED') {
        return renderHTML((decryptedToShow || decryptedText) + '<br/>');
      }

      return renderHTML(node.rawText + '<br/>');
    });
  }

  const onSelectKey = async (encryptedKey, signer, resetPrivateKey) => {
    const decryptedData = await signer.execute('DevelopData', enctypted.rawText);
    const base64Data = await signer.execute('Base64Encode', decryptedData.data || decryptedData);

    await actions.setDecryptedData(messageId, base64Data);
    setOpen(false);
    resetPrivateKey();
  };

  return (
    <>
      {root.childNodes.filter(encryptedNodes).map((node) => renderHTML(node.rawText + '<br/>'))}
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

const mapDispatch = (dispatch) => ({
  actions: {
    setDecryptedData: bindActionCreators(setDecryptedData, dispatch)
  }
});

const styled = withStyles({})(EncryptedMessage);
const translated = translate('MessagePage')(styled);
export default connect(null, mapDispatch)(translated);
