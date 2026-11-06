import React from 'react';
import type { ComponentType, ReactNode } from 'react';
import withStyles from '@mui/styles/withStyles';
import type { WithStyles } from '@mui/styles/withStyles';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import type { Translate } from 'react-translate';
import EmptyPage from 'components/EmptyPage';
import { Button } from '@mui/material';
import type { RootState } from 'store/types';

const styles = {
  wrap: {
    paddingTop: 64,
    paddingLeft: 260,
    '@media (max-width: 959px)': {
      paddingLeft: 0,
    },
  },
  button: {
    marginLeft: '62px',
  },
};

interface AuthProps extends WithStyles<typeof styles> {
  children?: ReactNode;
  t: Translate;
  DBError: boolean;
  // Read from the store but never used by the component.
  ERROR_503: boolean;
}

const Auth = ({ classes, children = <div />, t, DBError }: AuthProps) => {
  if (DBError) {
    return (
      <div className={classes.wrap}>
        <EmptyPage title={t('ERROR')} description={t('ERROR_DESCRIPTION')} />
        <Button variant="outlined" color="primary" onClick={() => (window.location.href = '/logout')} className={classes.button}>
          {t('SwitchUser')}
        </Button>
      </div>
    );
  }
  return children;
};

const translated = translate('Auth')(Auth);
// Auth returns `children` (a ReactNode), which react-redux's `connect` typing cannot infer props from; the
// cast gives it the props the styled, translated component really takes (everything except `t` and `classes`).
const styled = withStyles(styles)(translated) as ComponentType<Omit<AuthProps, 't' | 'classes'>>;
export default connect(({ auth: { DBError, ERROR_503 } }: RootState) => ({
  DBError,
  ERROR_503,
}))(styled);
