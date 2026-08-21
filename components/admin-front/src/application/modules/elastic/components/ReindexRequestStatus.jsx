import React from 'react';
import PropTypes from 'prop-types';

import { Chip, Tooltip } from '@mui/material';
import { useTranslate } from 'react-translate';
import ErrorIcon from '@mui/icons-material/ErrorOutline';

import capitalizeFirstLetter from 'helpers/capitalizeFirstLetter';

const colors = {
  running: 'success',
  finished: 'primary',
  error: 'secondary',
};

const ReindexRequestStatus = ({ status, details }) => {
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
      color={colors[status]}
      label={t(capitalizeFirstLetter(status) + 'Status')}
    />
  );
};

ReindexRequestStatus.propTypes = {
  status: PropTypes.string.isRequired,
};

export default ReindexRequestStatus;
