import React from 'react';
import { translate } from 'react-translate';
import { CopyToClipboard } from 'react-copy-to-clipboard';

import { ListItemIcon, Menu, MenuItem, Typography } from '@mui/material';

import FileCopyIcon from '@mui/icons-material/FileCopy';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';

import PasteFromClipboard from './PasteFromClipboard';

const SpreadsheetMenu = ({
  t,
  data,
  // value, // Currently unused - left commented for future use
  onChange,
  menuPosition,
  setMenuPosition,
  onCellsChanged,
}) => (
  <Menu
    open={Boolean(
      menuPosition && (menuPosition.row || navigator.clipboard.readText),
    )}
    onClose={() => setMenuPosition(null)}
    anchorReference="anchorPosition"
    anchorPosition={
      menuPosition
        ? { top: menuPosition.mouseY, left: menuPosition.mouseX }
        : undefined
    }
  >
    {menuPosition && menuPosition.row ? (
      <CopyToClipboard
        text={menuPosition.row[menuPosition.j].value}
        onCopy={() => setMenuPosition(null)}
      >
        <MenuItem>
          <ListItemIcon>
            <FileCopyIcon fontSize="small" />
          </ListItemIcon>
          <Typography variant="inherit">{t('CopyCell')}</Typography>
        </MenuItem>
      </CopyToClipboard>
    ) : null}
    <PasteFromClipboard
      t={t}
      data={data}
      menuPosition={menuPosition}
      onCellsChanged={onCellsChanged}
      handleClose={() => setMenuPosition(null)}
    />
    {menuPosition && menuPosition.row ? (
      <CopyToClipboard
        options={{ format: 'text/plain' }}
        text={
          menuPosition.row.map(({ value: strValue }) => strValue).join('\t') +
          '\n'
        }
        onCopy={() => setMenuPosition(null)}
      >
        <MenuItem>
          <ListItemIcon>
            <FileCopyIcon fontSize="small" />
          </ListItemIcon>
          <Typography variant="inherit">{t('CopyRow')}</Typography>
        </MenuItem>
      </CopyToClipboard>
    ) : null}
    {menuPosition && menuPosition.row ? (
      <MenuItem
        onClick={() => {
          setMenuPosition(null);

          onChange.bind(null, menuPosition.i)(null);

          // data.splice(menuPosition.i, 1);
          // value.splice(menuPosition.i, 1);
          // onChange(value);
        }}
      >
        <ListItemIcon>
          <HighlightOffIcon fontSize="small" />
        </ListItemIcon>
        <Typography variant="inherit">{t('DeleteRow')}</Typography>
      </MenuItem>
    ) : null}
  </Menu>
);

export default translate('Elements')(SpreadsheetMenu);
