import React from 'react';
import PropTypes from 'prop-types';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ArrowDownward from '@mui/icons-material/ArrowDownward';
import ArrowUpward from '@mui/icons-material/ArrowUpward';

const iconStyle = {
  fontSize: '18px',
  color: 'rgba(0, 0, 0, 0.54)',
  marginLeft: 5
};

const SortingIcon = ({ direction }) =>
  direction === 'asc' ? <ArrowUpward style={iconStyle} /> : <ArrowDownward style={iconStyle} />;

SortingIcon.propTypes = {
  direction: PropTypes.string.isRequired
};

const titleStyle = {
  margin: 0,
  justifyContent: 'space-between',
  display: 'flex',
  width: '100%'
};

const SortLabel = ({ onSort, children, direction }) => (
  <Tooltip title={children} placement="bottom">
    <Typography
      onClick={onSort}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.stopPropagation();
          e.preventDefault();
          onSort(e);
        }
      }}
      tabIndex={0}
      variant="body2"
      gutterBottom={true}
      style={titleStyle}
    >
      {children}
      {direction && <SortingIcon direction={direction} />}
    </Typography>
  </Tooltip>
);

SortLabel.propTypes = {
  onSort: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  direction: PropTypes.string.isRequired
};

export default SortLabel;
