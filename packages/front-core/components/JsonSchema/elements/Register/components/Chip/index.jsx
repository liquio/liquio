/* eslint-disable react/no-did-update-set-state */
import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import ClearIcon from '@mui/icons-material/Clear';
import Chip from '@mui/material/Chip';
import withStyles from '@mui/styles/withStyles';
import RenderOneLine from 'helpers/renderOneLine';

const styles = (theme) => ({
  chipWrap: {
    marginBottom: 8,
  },
  chipRoot: {
    padding: '20px 16px',
    borderRadius: 20,
    [theme.breakpoints.down('md')]: {
      height: 'auto',
      padding: 0,
    },
  },
  chipLabelWrap: {
    display: 'flex',
    alignItems: 'center'
  },
  chipDeleteIconWrap: {
    display: 'flex',
    alignItems: 'center',
    marginLeft: 8,
    cursor: 'pointer'
  },
  chipLabel: {
    whiteSpace: 'initial',
    paddingLeft: 28,
    fontSize: 16,
    lineHeight: '20px',
    overflow: 'initial',
    [theme.breakpoints.down('md')]: {
      fontSize: 13,
      lineHeight: '18px',
      padding: '6px 20px',
    },
  },
  deleteIcon: {
    width: 'unset',
    height: 'unset',
    position: 'relative',
    right: -3,
    margin: 0,
  },
});

const RegisterChip = ({ classes, label, onDelete, disabled, t }) => (
  <div className={classes.chipWrap}>
    <Chip
      label={
        <div className={classes.chipLabelWrap}>
          <RenderOneLine title={label} />
          <div
            role="button"
            tabIndex={0}
            aria-label={t('Delete')}
            onClick={onDelete}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onDelete();
              }
            }}
            className={classes.chipDeleteIconWrap}
          >
            <ClearIcon style={{ color: '#000', width: 24 }} />
          </div>
        </div>
      }
      tabIndex={0}
      disabled={disabled}
      classes={{
        root: classes.chipRoot,
        label: classes.chipLabel,
        deleteIcon: classes.deleteIcon,
      }}
    />
  </div>
);

RegisterChip.propTypes = {
  classes: PropTypes.object.isRequired,
  label: PropTypes.string.isRequired,
  onDelete: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};

const translated = translate('Elements')(RegisterChip);

const styled = withStyles(styles)(translated);

export default styled;
