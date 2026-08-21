import React from 'react';

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

const DuringThisPeriodSelect = ({ value, onChange }) => {
  const t = useTranslate('WorkflowDynamicsPage');
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleMenuItemClick = (newValue) => () => {
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
        {t(value)}
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
        <MenuItem
          disableRipple
          selected={value === '1 day'}
          onClick={handleMenuItemClick('1 day')}
        >
          <ListItemIcon>
            {value === '1 day' ? (
              <CheckBoxIcon />
            ) : (
              <CheckBoxOutlinedBlankIcon />
            )}
          </ListItemIcon>
          <ListItemText>{t('1 day')}</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleMenuItemClick('1 month')} disableRipple>
          <ListItemIcon>
            {value === '1 month' ? (
              <CheckBoxIcon />
            ) : (
              <CheckBoxOutlinedBlankIcon />
            )}
          </ListItemIcon>
          <ListItemText>{t('1 month')}</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleMenuItemClick('1 year')} disableRipple>
          <ListItemIcon>
            {value === '1 year' ? (
              <CheckBoxIcon />
            ) : (
              <CheckBoxOutlinedBlankIcon />
            )}
          </ListItemIcon>
          <ListItemText>{t('1 year')}</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default DuringThisPeriodSelect;
