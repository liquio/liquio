import React from 'react';
import { useTranslate } from 'react-translate';
import { Tooltip, IconButton, ListItemIcon, ListItemText } from '@mui/material';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import theme from 'theme';

const { defaultLayout } = theme as unknown as { defaultLayout?: boolean };

type ColumnId = string | number;

interface Column {
  id: ColumnId;
  title?: React.ReactNode;
  description?: React.ReactNode;
}

interface ColumnChooserProps {
  classes: {
    iconWrapper: string;
    iconTitle: string;
    columnsMenu: string;
  };
  selectedColumns: ColumnId[];
  columns: Column[];
  setSelectedColumns: (columns: ColumnId[]) => void;
}

const ColumnChooser = ({
  classes,
  selectedColumns,
  columns,
  setSelectedColumns,
}: ColumnChooserProps) => {
  const t = useTranslate('Elements');
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLElement>) =>
    setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleChooseColumns = (id: ColumnId) => {
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
        {columns.map(({ id, title, description }) => (
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
        ))}
      </Menu>
    </>
  );
};

export default ColumnChooser;
