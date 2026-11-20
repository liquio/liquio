import React from 'react';

import { Chip, Tooltip } from '@mui/material';
import { useTranslate } from 'react-translate';
import ErrorIcon from '@mui/icons-material/ErrorOutline';

import capitalizeFirstLetter from 'helpers/capitalizeFirstLetter';

const colors: Record<string, string> = {
  running: 'success',
  finished: 'primary',
  error: 'secondary',
};

interface ReindexRequestStatusProps {
  status: string;
  details?: React.ReactNode;
}

const ReindexRequestStatus = ({ status, details }: ReindexRequestStatusProps) => {
  const t = useTranslate('ElasticSettings');
  let icon;

  if (details) {
    icon = (
      <Tooltip title={details}>
        <ErrorIcon />
      </Tooltip>
    );
  }

  return (
    <Chip
      icon={icon}
      color={colors[status] as never}
      label={t(capitalizeFirstLetter(status) + 'Status')}
    />
  );
};

export default ReindexRequestStatus;
