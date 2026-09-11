import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { timeout } from 'promise-timeout';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';
import moment from 'moment';

import { readAsUint8Array } from 'helpers/readFileList';
import checkExpiringDate from 'helpers/checkExpiringDate';
import edsService from 'services/eds';
import isHTML from 'helpers/isHTML';
import FileKeySignFormContent from './FileKeySignFormContent';

class FileKeySignForm extends React.Component {
  constructor(props) {
    super(props);

    this.passwordRef = React.createRef();

    this.input = null;

    this.state = {
      server: 0,
      password: null,
      key: null,
      keys: {},
      selectedKey: null,
      errors: {},
      signingError: null,
      showErrorDialog: false,
      expiring: false
    };
  }

  handleChange =
    (name) =>
    ({ target }) => {
      const { errors } = this.state;
      delete errors[name];

      this.setState({ [name]: target.value, errors });
    };

  handleKeyChange = (key) => {
    if (!key) {
      return;
    }

    const { setBusy } = this.props;
    const { errors } = this.state;
    delete errors.key;
    this.setState({ key, errors });
    setBusy(true);
    this.enumKeys(key);
    setBusy(false);

    this.passwordRef && this.passwordRef.current.focus();
  };

  handleCloseDialog = () =>
    this.setState({
      expiring: false
    });

  checkExpiringDateWarning = (certificate) => {
    const result = checkExpiringDate(certificate);

    if (!result) return false;

    this.setState({
      expiring: result
    });
  };

  enumKeys = async (key) => {
    const signer = edsService.getSigner();
    const keyAsUint8Array = await readAsUint8Array(key);

    const keys = {};

    const enumFunc = async (index) => {
      try {
        const existsKey = await signer.execute('EnumJKSPrivateKeys', keyAsUint8Array, index);
        if (existsKey) {
          const privateKey = await signer.execute('GetJKSPrivateKey', keyAsUint8Array, existsKey);

          for (let c = 0; c < privateKey.certificates.length; c++) {
            try {
              await signer.execute('SaveCertificate', privateKey.certificates[c]);
            } catch (e) {
              // console.log('SaveCertificate', e);
              // nothign to do
            }
          }

          const certificates = await Promise.all(
            privateKey.certificates.map((cert) => signer.execute('ParseCertificate', cert))
          );

          const certificate = certificates.find(({ keyUsage, subjDRFOCode }) => {
            const keyUsageCheck = keyUsage === 'Протоколи розподілу ключів';
            return subjDRFOCode && keyUsageCheck;
          });

          if (certificate) {
            keys[existsKey] = certificate;
            this.checkExpiringDateWarning(certificate);
          }
          await enumFunc(index + 1);
        }
      } catch (e) {
        // console.log('error', e);
        // Nothing to do
      }
    };

    await enumFunc(0);
    this.setState({ keys, selectedKey: Object.keys(keys)[0] });
  };

  tryToSubmit = ({ key }) => key === 'Enter' && this.handleSelectKey();

  handleClose = () => this.setState({ showErrorDialog: false });

  getSignCertificate = async (key, password) => {
    const { selectedKey } = this.state;
    const signer = edsService.getSigner();

    if (!selectedKey) {
      const privateKey = await signer.execute('ReadPrivateKey', key, password);
      return privateKey;
    }

    const privatKeyContainer = await signer.execute('GetJKSPrivateKey', key, selectedKey);
    return signer.execute('ReadPrivateKey', privatKeyContainer.privateKey, password);
  };

  readKeyOnServer = async (keyAsUint8Array, password, serverIndex, iterate = true) => {
    const serverList = edsService.getServerList();
    const acskServer = serverList[serverIndex];
    if (!acskServer) {
      return null;
    }

    const signer = edsService.getSigner();

    try {
      await signer.execute('setServer', acskServer);
      const privateKey = await timeout(this.getSignCertificate(keyAsUint8Array, password), 5000);
      return privateKey;
    } catch (e) {
      if (!iterate) {
        throw e;
      }
      return this.readKeyOnServer(keyAsUint8Array, password, serverIndex + 1, iterate);
    }
  };

  readPrivateKey = async () => {
    const signer = edsService.getSigner();
    const { server, key, password } = this.state;
    const keyAsUint8Array = await readAsUint8Array(key);

    let privateKey = await this.readKeyOnServer(
      keyAsUint8Array,
      password,
      server && server - 1,
      !server
    );

    if (!privateKey) {
      await signer.execute('SetUseCMP', false);
      privateKey = await this.getSignCertificate(keyAsUint8Array, password);
    }

    return privateKey;
  };

  handleSelectKey = async () => {
    const { t, onSelectKey, setBusy } = this.props;
    if (!onSelectKey) {
      return;
    }
    const errors = this.validate();

    if (Object.keys(errors).length) {
      this.setState({ errors });
      if (errors.password) {
        this.passwordRef && this.passwordRef.current.focus();
      }
      return;
    }

    setBusy(true);

    try {
      const privateKey = await this.readPrivateKey();

      const signer = edsService.getSigner();
      await onSelectKey(privateKey, signer, () => signer.execute('ResetPrivateKey'), {
        type: 'file'
      });
    } catch (e) {
      if (e instanceof Error) {
        console.log('e =>', e);

        this.setState({
          signingError:
            typeof e?.details === 'string'
              ? e.details
              : isHTML(e.message)
              ? e.message
              : t(e.message),
          showErrorDialog: true
        });
      }
    }

    setBusy(false);
  };

  validate() {
    const { t } = this.props;
    const { server, key, password } = this.state;
    const errors = {};
    if (server === null) {
      errors.server = t('SelectServer');
    }

    if (!key) {
      errors.key = t('SelectKey');
    }

    if (!password) {
      errors.password = t('FillPassword');
    }

    return errors;
  }

  toggleShowPassword = () => this.setState({ showPassword: !this.state.showPassword });

  render = () => {
    const { t } = this.props;
    const { expiring } = this.state;

    return (
      <>
        <FileKeySignFormContent
          {...this.props}
          {...this.state}
          keyFile={this.state.key}
          passwordRef={this.passwordRef}
          handleKeyChange={this.handleKeyChange}
          handleChange={this.handleChange}
          handleClose={this.handleClose}
          handleSelectKey={this.handleSelectKey}
          tryToSubmit={this.tryToSubmit}
          toggleShowPassword={this.toggleShowPassword}
        />

        <Dialog open={expiring} onClose={this.handleCloseDialog}>
          <DialogTitle>{t('ExpiringTitle')}</DialogTitle>
          <DialogContent>
            <DialogContentText>
              {t('ExpiringDescription', {
                days: moment().add(expiring, 'days').fromNow()
              })}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={this.handleCloseDialog}
              autoFocus={true}
              variant="contained"
              color="primary"
            >
              {t('Continue')}
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  };
}

FileKeySignForm.propTypes = {
  setId: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired,
  onSelectKey: PropTypes.func.isRequired,
};

export default translate('SignForm')(FileKeySignForm);
