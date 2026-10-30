import React from 'react';
import { Dialog, LinearProgress, Typography } from '@mui/material';

interface PreloaderModalProps {
  open: boolean;
  onClose?: () => void;
  title?: React.ReactNode;
}

const PreloaderModal = ({ open, onClose, title }: PreloaderModalProps) => (
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
