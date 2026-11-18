import React, { Component } from 'react';
import { Typography, Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import withStyles from '@mui/styles/withStyles';
import type { StyleRules, WithStyles } from '@mui/styles/withStyles';
import translate from 'react-translate/lib/translate';
import type { Translate } from 'react-translate';

import setComponentsId from 'helpers/setComponentsId';
import DefaultLoginLayout from './components/DefaultLoginLayout';
import type { LoginSetId } from './components/types';

interface LoginPageProps extends WithStyles<typeof styles> {
  t: Translate;
  setId: LoginSetId;
}

interface LoginPageState {
  error: null;
  showErrorModal: boolean;
}

const styles = () => ({
  closeIcon: {
    position: 'absolute',
    top: 14,
    right: 14,
    fontSize: 20,
    minWidth: 40,
  },
}) satisfies StyleRules;

class LoginPage extends Component<LoginPageProps, LoginPageState> {
  static defaultProps = {
    setId: setComponentsId('login'),
  };

  state: LoginPageState = { error: null, showErrorModal: false };

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

  render() {
    const { setId, t } = this.props;
    // `closeIconImg` is not one of the styles, so it is `undefined` at runtime (kept).
    const classes = this.props.classes as Record<string, string | undefined>;
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
        <Layout setId={setId} auth={true} />
      </>
    );
  }
}

const styled = withStyles(styles)(LoginPage);
export default translate('LoginPage')(styled);
