import React from 'react';

import { ListItemIcon, MenuItem, Typography } from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';

const PasteFromClipboard = ({
  t,
  data,
  menuPosition,
  handleClose,
  onCellsChanged,
}) => {
  const [cell, setCell] = React.useState({});

  React.useEffect(() => {
    if (
      menuPosition &&
      (cell.i !== menuPosition.i || cell.j !== menuPosition.j)
    ) {
      setCell(menuPosition);
    }
  }, [cell.i, cell.j, menuPosition]);

  const handlePaste = async () => {
    handleClose();

    const copyValue = await navigator.clipboard.readText();
    const copyValues = copyValue
      .split(/\r\n|\n|\r/)
      .map((row) => row.split('\t'));

    const { i, j } = cell;

    const changes = [];
    const addition = [];

    copyValues.forEach((newRow, newRowIndex) =>
      newRow.forEach((newCellValue, newCellIndex) => {
        const row = i + newRowIndex;
        const col = j + newCellIndex;
        if (data[row] && data[row][col]) {
          changes.push({ cell: data[row][col], row, col, value: newCellValue });
        } else {
          addition.push({ cell: {}, row, col, value: newCellValue });
        }
      }),
    );

    onCellsChanged(changes, addition);
  };

  if (!navigator.clipboard.readText) {
    return null;
  }

  return (
    <MenuItem onClick={handlePaste}>
      <ListItemIcon>
        <AssignmentIcon fontSize="small" />
      </ListItemIcon>
      <Typography variant="inherit">{t('PasteFromClipboard')}</Typography>
    </MenuItem>
  );
};

export default PasteFromClipboard;
