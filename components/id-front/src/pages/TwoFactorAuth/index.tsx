import React, { Component } from 'react';
import setComponentsId from 'helpers/setComponentsId';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import type { Translate } from 'react-translate';

import promiseChain from 'helpers/promiseChain';
import Layout from 'layouts/topHeader';

import { Typography, Grid, Button, TextField } from '@mui/material';
import type { TypographyProps } from '@mui/material';

import withStyles from '@mui/styles/withStyles';
import type { Styles } from '@mui/styles/withStyles';
import type { Theme } from '@mui/material/styles';

import style from 'assets/jss';

import { checkSMSCode, checkTotpCode } from 'actions/auth';
import type { RootState } from 'store/types';

// The headings use the MUI v4 variants `headline` and `subheading`, which v5 no longer knows (they render a
// `span`). Kept.
const headline = 'headline' as TypographyProps['variant'];
const subheading = 'subheading' as TypographyProps['variant'];

// `info` from `GET /auth`; the page reads `twoFactorType` ("totp", anything else means SMS) and `phone`.
type TwoFactorValues = Record<string, unknown>;

interface TwoFactorAuthPageProps {
  t: Translate;
  classes: Record<string, string>;
  // `defaultProps` give `setId` (`setComponentsId('twoFactorAuth')`) and `values` (`{}`) a value.
  setId: (elementName: string) => string;
  values?: TwoFactorValues;
}

interface TwoFactorAuthPageState {
  code: string;
  codeError: string | null;
  values: TwoFactorValues;
  // Set by `handleActivate` only; nothing reads them.
  checked?: boolean;
  showActivation?: boolean;
}

class TwoFactorAuthPage extends Component<TwoFactorAuthPageProps, TwoFactorAuthPageState> {
  static defaultProps = {
    setId: setComponentsId('twoFactorAuth'),
    values: {},
  };

  state: TwoFactorAuthPageState = {
    code: '',
    codeError: null,
    // `defaultProps` make this `{}` when no `values` are passed.
    values: this.props.values as TwoFactorValues,
  };

  handleChangeCode = ({ target: { value } }: { target: { value: string } }) => this.setState({ code: value, codeError: null });

  handleActivate = () =>
    promiseChain([
      this.checkCodeValid,
      this.verifyActivationCode,
      // `this.handleFinish` does not exist, so the callback is `undefined` (kept).
      () => this.setState({ checked: true, showActivation: false }, (this as unknown as { handleFinish?: () => void }).handleFinish),
    ]).catch((error) => this.setState({ codeError: error as string }));

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
      const result = (await checkTotpCode(code)) as { success?: boolean };
      success = result.success as boolean;
    } else {
      const result = (await checkSMSCode(code)) as { success?: boolean };
      success = result.success as boolean;
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
            <Typography variant={headline} gutterBottom={true} id={setId('title')}>
              {t('TITLETFA')}
            </Typography>
            <div>
              <Typography variant={subheading} gutterBottom={true} id={setId('sub-title')}>
                {t('SUBTITLETFA')}
              </Typography>
            </div>
          </>
        ) : (
          <>
            <Typography variant={headline} gutterBottom={true} id={setId('title')}>
              {t('TITLE')}
            </Typography>
            <div>
              <Typography variant={subheading} gutterBottom={true} id={setId('sub-title')}>
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
            >
              {t('ACTIVATE')}
            </Button>
          </Grid>
        </Grid>
      </Layout>
    );
  }
}

const styled = withStyles(style as Styles<Theme, {}, string>)(TwoFactorAuthPage);
const translated = translate('TwoFactorAuthPage')(styled);

// `authorization` is not a slice of the root reducer (the slices are `auth` and `eds`), so `auth` is always
// `undefined` (and the page never reads it). Preserved.
function mapStateToProps(state: RootState) {
  return { auth: (state as RootState & { authorization?: unknown }).authorization };
}

export default connect(mapStateToProps)(translated);
