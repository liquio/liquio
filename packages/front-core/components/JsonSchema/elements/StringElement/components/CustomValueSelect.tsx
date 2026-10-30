import React from 'react';
import { translate, Translate } from 'react-translate';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from '@mui/material';
import withStyles, { WithStyles } from '@mui/styles/withStyles';
import { Theme } from '@mui/material/styles';

const styles = (theme: Theme) => ({
  menuItem: {
    minHeight: 36,
    [theme.breakpoints.down('md')]: {
      fontSize: 13,
      lineHeight: '22px',
    },
  },
});

interface CustomValueSelectProps extends WithStyles<typeof styles> {
  t: Translate;
  customValueText?: string;
  onChange: (value: string) => void;
}

const CustomValueSelect = ({ t, classes, customValueText, onChange }: CustomValueSelectProps) => {
  const [open, setOpen] = React.useState(false);
  const [customValue, setCustomValue] = React.useState('');

  const showCustomValueDialog = (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(true);
  };

  return (
    <>
      <MenuItem className={classes.menuItem} onClick={showCustomValueDialog}>
        {customValueText || t('CustomValue')}
      </MenuItem>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth={true}
      >
        <DialogTitle>{customValueText || t('CustomValue')}</DialogTitle>
        <DialogContent>
          <TextField
            variant="standard"
            value={customValue}
            onChange={({ target: { value: newCustomValue } }) =>
              setCustomValue(newCustomValue)
            }
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpen(false);
              setCustomValue('');
            }}
            aria-label={t('Cancel')}
          >
            {t('Cancel')}
          </Button>
          <Button
            onClick={() => {
              setOpen(false);
              onChange(customValue);
              setCustomValue('');
            }}
            aria-label={t('Save')}
          >
            {t('Save')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const styled = withStyles(styles)(CustomValueSelect);
export default translate('Elements')(styled);
