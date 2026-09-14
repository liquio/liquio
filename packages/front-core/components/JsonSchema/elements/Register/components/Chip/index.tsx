import React from 'react';
import { translate } from 'react-translate';
import ClearIcon from '@mui/icons-material/Clear';
import Chip from '@mui/material/Chip';
import withStyles, { WithStyles } from '@mui/styles/withStyles';
import { Theme } from '@mui/material/styles';
import RenderOneLine from 'helpers/renderOneLine';

const styles = (theme: Theme) => ({
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
    position: 'relative' as const,
    right: -3,
    margin: 0,
  },
});

interface RegisterChipProps extends WithStyles<typeof styles> {
  label: string;
  onDelete: () => void;
  disabled: boolean;
  t: (key: string) => string;
}

const RegisterChip = ({ classes, label, onDelete, disabled, t }: RegisterChipProps) => (
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

const translated = translate('Elements')(RegisterChip);

const styled = withStyles(styles)(translated);

export default styled;
