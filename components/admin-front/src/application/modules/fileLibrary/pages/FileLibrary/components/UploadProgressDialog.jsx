import React from 'react';
import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Typography
} from '@mui/material';

const UploadProgressDialog = ({ t, open, currentFileName, completed, total }) => (
  <Dialog open={open} fullWidth maxWidth="xs">
    <DialogTitle>{t('UploadingFiles')}</DialogTitle>
    <DialogContent>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <CircularProgress size={28} />
        <Box>
          <Typography variant="body2">{currentFileName || t('PreparingUpload')}</Typography>
          <Typography variant="caption" color="text.secondary">
            {t('UploadProgress', { completed, total })}
          </Typography>
        </Box>
      </Box>
      <LinearProgress
        variant={total ? 'determinate' : 'indeterminate'}
        value={total ? (completed / total) * 100 : 0}
      />
    </DialogContent>
  </Dialog>
);

export default UploadProgressDialog;
