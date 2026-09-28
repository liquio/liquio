/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { Link } from 'react-router-dom';
import { Dialog, DialogTitle, DialogContent, DialogContentText } from '@mui/material';

const StoreEventError = ({ t, error = {}, onClose = () => null }: any) =>
  error ? (
    <Dialog open={!!(error && Object.keys(error).length)} onClose={onClose}>
      <DialogTitle>{t('ErrorDialogTitle')}</DialogTitle>
      <DialogContent>
        <DialogContentText>{t(error.message)}</DialogContentText>
      </DialogContent>
      <DialogContent>
        <Link to="/">{t('BackToList')}</Link>
      </DialogContent>
    </Dialog>
  ) : null;

StoreEventError.propTypes = {
  error: PropTypes.object,
  t: PropTypes.func.isRequired,
  onClose: PropTypes.func
};

export default translate('TaskPage')(StoreEventError as any);
