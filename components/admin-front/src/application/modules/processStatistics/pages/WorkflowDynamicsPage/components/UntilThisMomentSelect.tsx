import React, { useMemo } from 'react';

import { useTranslate } from 'react-translate';
import {
  Button,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
} from '@mui/material';

import CheckBoxIcon from '@mui/icons-material/CheckBox';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CheckBoxOutlinedBlankIcon from '@mui/icons-material/CheckBoxOutlineBlankOutlined';

import DateSelect from './DateSelect';
import usePeriodOptions from '../hooks/usePeriodOptions';
import periodTimeFormat from '../helpers/periodTimeFormat';
import moment from 'moment';

interface UntilThisMomentSelectProps {
  value: string;
  period: string;
  onChange: (value: string) => void;
}

const UntilThisMomentSelect = ({ value, period, onChange }: UntilThisMomentSelectProps) => {
  const t = useTranslate('WorkflowDynamicsPage');
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const [newValue, setNewValue] = React.useState(value);

  const options = usePeriodOptions(period);
  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  const stringifiedValue = useMemo(() => {
    return periodTimeFormat(value, period);
  }, [period, value]);

  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleMenuItemClick = (newValue: string) => () => {
    setNewValue(newValue);
  };

  const handleConfirm = () => {
    if (newValue === 'Invalid date') return;
    setAnchorEl(null);
    onChange(newValue);
  };

  return (
    <>
      <Button
        color="primary"
        variant="contained"
        onClick={handleClick}
        endIcon={<KeyboardArrowDownIcon />}
      >
        {selectedOption ? t(selectedOption.label as string) : stringifiedValue}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        style={{ marginTop: 48 }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {options.map((option) => (
          <MenuItem
            key={option.value}
            onClick={handleMenuItemClick(option.value as string)}
            disableRipple
          >
            <ListItemIcon>
              {option.value === newValue ? (
                <CheckBoxIcon />
              ) : (
                <CheckBoxOutlinedBlankIcon />
              )}
            </ListItemIcon>
            <ListItemText>{t(option.label as string)}</ListItemText>
          </MenuItem>
        ))}
        <MenuItem disableRipple>
          <ListItemIcon>
            {options.every((option) => option.value !== newValue) ? (
              <CheckBoxIcon />
            ) : (
              <CheckBoxOutlinedBlankIcon />
            )}
          </ListItemIcon>
          <ListItemText>
            <DateSelect
              value={newValue}
              period={period}
              error={newValue === 'Invalid date' ? t('InvalidDate') : null}
              onChange={(newValue) =>
                handleMenuItemClick(
                  moment(newValue as string)
                    .startOf('day')
                    .format('YYYY-MM-DD HH:mm:ss.SSS'),
                )()
              }
            />
          </ListItemText>
        </MenuItem>
        <MenuItem style={{ justifyContent: 'end' }} disableRipple>
          <Button color="primary" variant="contained" onClick={handleConfirm}>
            {t('Apply')}
          </Button>
        </MenuItem>
      </Menu>
    </>
  );
};

export default UntilThisMomentSelect;
