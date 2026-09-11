import React from 'react';
import { Dialog, LinearProgress, Typography } from '@mui/material';

const PreloaderModal = ({ open, onClose, title }) => (
  <Dialog
    open={open}
    onClose={onClose}
    maxWidth="sm"
    fullWidth={true}
    style={{ textAlign: 'center' }}
  >
    {title ? <Typography>{title}</Typography> : null}
    <LinearProgress />
  </Dialog>
);

export default PreloaderModal;
