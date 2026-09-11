import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Typography, Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import withStyles from '@mui/styles/withStyles';
import PropTypes from 'prop-types';
import translate from 'react-translate/lib/translate';
import moment from 'moment';
import MobileDetect from 'mobile-detect';

import setComponentsId from 'helpers/setComponentsId';
import { requestSignData, checkSignData } from 'actions/eds';
import { getAuth } from 'actions/auth';
import DefaultLoginLayout from './components/DefaultLoginLayout';
import { getConfig } from 'helpers/configLoader';

const md = new MobileDetect(window.navigator.userAgent);
const isMobile = !!md.mobile();

const styles = () => ({
  closeIcon: {
    position: 'absolute',
    top: 14,
    right: 14,
    fontSize: 20,
    minWidth: 40,
  },
});

class LoginPage extends Component {
  state = { error: null, showErrorModal: false };

  componentDidMount = async () => {
    const isMobileAuth = localStorage.getItem('isMobileAuth');
    if (isMobileAuth) {
      this.setState({ showErrorModal: true });
    }
  };

  closeModal = () => {
    localStorage.removeItem('isMobileAuth');
    this.setState({ showErrorModal: false });
  };

  getEncodeCert = async (signer, index) => {
    const certif = await signer.execute('EnumOwnCertificates', index);

    if (certif === null) {
      throw new Error('Сертифікат шифрування відсутній. Зверніться до вашого АЦСК');
    }

    if (certif.keyUsage === 'Протоколи розподілу ключів') {
      return certif;
    }

    return this.getEncodeCert(signer, index + 1);
  };

  getDataToSign = async () => {
    const { t } = this.props;

    const savedToken = localStorage.getItem('savedToken');

    const { token } =
      savedToken && isMobile
        ? {
            token: savedToken,
          }
        : await requestSignData();

    this.setState({ token });

    if (isMobile) {
      localStorage.setItem('savedToken', token);
    }

    return {
      data: [{ name: t('Authorization'), data: token }],
      expireTime: Date.parse(moment().add(3, 'minutes').toDate()),
    };
  };

  onSignHash = async ([{ signature }] = [{}]) => {
    const { t } = this.props;
    const { token } = this.state;

    const signData = {
      signature,
    };

    if (isMobile) {
      signData['token'] = localStorage.getItem('savedToken') || token;
    } else {
      signData['token'] = token;
    }

    const result = await checkSignData(signData);

    if (result instanceof Error) {
      await getAuth();
      throw new Error(t(result.message, { details: result.details }));
    }

    await getAuth();
  };

  signDataAndLogin = async (cert, signer, resetPrivateKey) => {
    const { t } = this.props;
    const { useEncodeCert, allowLoginWithoutEncodeCert } = getConfig().eds || {};

    const { token } = await requestSignData();
    const signature = await signer.execute('SignData', token, true);

    const signData = { signature, token };

    if (useEncodeCert) {
      try {
        const { issuer, serial } = await this.getEncodeCert(signer, 0);

        const decodedCert = await signer.execute('GetCertificate', issuer, serial);
        const encodeCert = await signer.execute('Base64Encode', decodedCert);

        signData.encodeCert = encodeCert;
        signData.encodeCertSerial = serial;
      } catch (e) {
        if (!allowLoginWithoutEncodeCert) {
          throw e;
        }
      }
    }

    // debugger;
    const result = await checkSignData(signData);

    if (result instanceof Error) {
      await getAuth();
      throw new Error(t(result.message, { details: result.details }));
    }

    await resetPrivateKey();
    await getAuth();
  };

  handleSelectKey = (cert, signer, resetPrivateKey) => {
    let iteration = 0;

    const execute = () =>
      this.signDataAndLogin(cert, signer, resetPrivateKey).catch((e) => {
        iteration += 1;
        if (iteration <= 3) {
          return execute();
        }
        throw e;
      });

    return execute();
  };

  render() {
    const { setId, t, classes } = this.props;
    const { showErrorModal } = this.state;
    let Layout = DefaultLoginLayout;

    return (
      <>
        {showErrorModal && (
          <Dialog
            open={true}
            onClose={this.closeModal}
            sx={{
              '& .MuiDialog-container': {
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
                opacity: 1,
              },
            }}
          >
            <DialogTitle>{t('MobileAuthErrorTitle')}</DialogTitle>
            <IconButton onClick={this.closeModal} className={classes.closeIcon}>
              <CloseIcon className={classes.closeIconImg} />
            </IconButton>
            <DialogContent>
              <Typography>{t('MobileAuthErrorText')}</Typography>
            </DialogContent>
          </Dialog>
        )}
        <Layout setId={setId} auth={true} onSignHash={this.onSignHash} getDataToSign={this.getDataToSign} onSelectKey={this.handleSelectKey} />
      </>
    );
  }
}

LoginPage.propTypes = {
  setId: PropTypes.func,
  dataToSign: PropTypes.string,
};

LoginPage.defaultProps = {
  setId: setComponentsId('login'),
  dataToSign: null,
};

const mapStateToProps = ({ authorization, eds: { dataToSign } }) => ({
  ...authorization,
  dataToSign,
});

const styled = withStyles(styles)(LoginPage);
const translated = translate('LoginPage')(styled);
export default connect(mapStateToProps)(translated);
