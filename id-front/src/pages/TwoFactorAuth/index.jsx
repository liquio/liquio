import React, { Component } from 'react';
import PropTypes from 'prop-types';
import setComponentsId from 'helpers/setComponentsId';
import { connect } from 'react-redux';
import { translate } from 'react-translate';

import promiseChain from 'helpers/promiseChain';
import Layout from 'layouts/topHeader';

import { Typography, Grid, Button, TextField } from '@mui/material';

import withStyles from '@mui/styles/withStyles';

import style from 'assets/jss';

import { checkSMSCode, checkTotpCode } from 'actions/auth';

class TwoFactorAuthPage extends Component {
  state = {
    code: '',
    codeError: null,
    values: this.props.values,
  };

  handleChangeCode = ({ target: { value } }) => this.setState({ code: value, codeError: null });

  handleActivate = () =>
    promiseChain([
      this.checkCodeValid,
      this.verifyActivationCode,
      () => this.setState({ checked: true, showActivation: false }, this.handleFinish),
    ]).catch((error) => this.setState({ codeError: error }));

  checkCodeValid = async () => {
    const { t } = this.props;
    const { code } = this.state;
    if (!code) {
      throw t('EMPTY_CODE_ERROR');
    }
  };

  verifyActivationCode = async () => {
    const { t } = this.props;
    const {
      code,
      values: { twoFactorType },
    } = this.state;

    let success = false;

    if (twoFactorType === 'totp') {
      const result = await checkTotpCode(code);
      success = result.success;
    } else {
      const result = await checkSMSCode(code);
      success = result.success;
    }

    if (!success) {
      throw t('ACTIVATION_CODE_INVALID');
    }

    window.location.href = '/authorise/continue';
  };

  render() {
    const { classes, t, setId } = this.props;

    const {
      code,
      codeError,
      values: { phone, twoFactorType },
    } = this.state;

    return (
      <Layout setId={setId}>
        {twoFactorType === 'totp' ? (
          <>
            <Typography variant="headline" gutterBottom={true} id={setId('title')}>
              {t('TITLETFA')}
            </Typography>
            <div>
              <Typography variant="subheading" gutterBottom={true} id={setId('sub-title')}>
                {t('SUBTITLETFA')}
              </Typography>
            </div>
          </>
        ) : (
          <>
            <Typography variant="headline" gutterBottom={true} id={setId('title')}>
              {t('TITLE')}
            </Typography>
            <div>
              <Typography variant="subheading" gutterBottom={true} id={setId('sub-title')}>
                {t('SUBTITLE', { phone })}
              </Typography>
            </div>
          </>
        )}

        <Grid container={true} spacing={8} id={setId('container')} className={classes.mt16}>
          <Grid item={true} xs={12} sm={6} id={setId('grid')}>
            <TextField
              variant="standard"
              id={setId('code')}
              name="code"
              margin="none"
              value={code}
              error={!!codeError}
              helperText={codeError}
              label={t('ACTIVATION_CODE')}
              onChange={this.handleChangeCode}
              className={classes.fullWidth}
            />
          </Grid>
          <Grid item={true} xs={12} sm={6} id={setId('grid-2')}>
            <Button
              variant="contained"
              color="primary"
              className={classes.fullWidth}
              onClick={this.handleActivate}
              setId={(elementName) => setId(`active-${elementName}`)}
            >
              {t('ACTIVATE')}
            </Button>
          </Grid>
        </Grid>
      </Layout>
    );
  }
}

TwoFactorAuthPage.propTypes = {
  setId: PropTypes.func,
  t: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired,
  values: PropTypes.object,
};

TwoFactorAuthPage.defaultProps = {
  setId: setComponentsId('twoFactorAuth'),
  values: {},
};

const styled = withStyles(style)(TwoFactorAuthPage);
const translated = translate('TwoFactorAuthPage')(styled);

function mapStateToProps(state) {
  return { auth: state.authorization };
}

export default connect(mapStateToProps)(translated);
