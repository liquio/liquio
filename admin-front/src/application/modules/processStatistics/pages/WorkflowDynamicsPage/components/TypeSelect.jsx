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

import capitalizeFirstLetter from 'helpers/capitalizeFirstLetter';

const TypeSelect = ({ value, onChange }) => {
  const t = useTranslate('WorkflowDynamicsPage');
  const [anchorEl, setAnchorEl] = React.useState(null);

  const open = Boolean(anchorEl);

  const handleClick = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleMenuItemClick = (option) => () => {
    handleClose();
    onChange(option);
  };

  return (
    <>
      <Button
        color="primary"
        variant="contained"
        onClick={handleClick}
        endIcon={<KeyboardArrowDownIcon />}
      >
        {t(capitalizeFirstLetter(value))}
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
        <MenuItem onClick={handleMenuItemClick('percentage')} disableRipple>
          <ListItemIcon>
            {'percentage' === value ? (
              <CheckBoxIcon />
            ) : (
              <CheckBoxOutlinedBlankIcon />
            )}
          </ListItemIcon>
          <ListItemText>{t('Percentage')}</ListItemText>
        </MenuItem>

        <MenuItem onClick={handleMenuItemClick('count')} disableRipple>
          <ListItemIcon>
            {'count' === value ? (
              <CheckBoxIcon />
            ) : (
              <CheckBoxOutlinedBlankIcon />
            )}
          </ListItemIcon>
          <ListItemText>{t('Count')}</ListItemText>
        </MenuItem>

        <MenuItem onClick={handleMenuItemClick('errors')} disableRipple>
          <ListItemIcon>
            {'errors' === value ? (
              <CheckBoxIcon />
            ) : (
              <CheckBoxOutlinedBlankIcon />
            )}
          </ListItemIcon>
          <ListItemText>{t('Errors')}</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default TypeSelect;
