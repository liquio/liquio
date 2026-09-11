import React from 'react';
import { useTranslate } from 'react-translate';
import { Tooltip, IconButton, ListItemIcon, ListItemText } from '@mui/material';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import theme from 'theme';

const { defaultLayout } = theme;

const ColumnChooser = ({
  classes,
  selectedColumns,
  columns,
  setSelectedColumns,
}) => {
  const t = useTranslate('Elements');
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);
  const handleClick = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleChooseColumns = (id) => {
    if (selectedColumns.includes(id)) {
      setSelectedColumns(selectedColumns.filter((columnId) => columnId !== id));
    } else {
      setSelectedColumns([...selectedColumns, id]);
    }
  };

  return (
    <>
      {defaultLayout ? (
        <div className={classes.iconWrapper}>
          <IconButton onClick={handleClick} aria-label={t('ColumnChooser')}>
            <ViewColumnIcon />
          </IconButton>
          <p className={classes.iconTitle}>{t('ColumnChooser')}</p>
        </div>
      ) : (
        <Tooltip title={t('ColumnChooser')}>
          <IconButton aria-label={t('ColumnChooser')}>
            <ViewColumnIcon />
          </IconButton>
        </Tooltip>
      )}

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        className={classes.columnsMenu}
      >
        {columns.map(({ id, title, description }) => {
          return (
            <MenuItem key={id} onClick={() => handleChooseColumns(id)}>
              <ListItemIcon>
                {selectedColumns.includes(id) ? (
                  <CheckBoxIcon fontSize="small" />
                ) : (
                  <CheckBoxOutlineBlankIcon fontSize="small" />
                )}
              </ListItemIcon>
              <ListItemText>{description || title}</ListItemText>
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
};

export default ColumnChooser;
