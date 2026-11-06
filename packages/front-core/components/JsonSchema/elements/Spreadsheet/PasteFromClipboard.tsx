import React from 'react';

import { ListItemIcon, MenuItem, Typography } from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';

interface CellChange {
  cell: unknown;
  row: number;
  col: number;
  value: unknown;
}

interface MenuPosition {
  i: number;
  j: number;
}

interface PasteFromClipboardProps {
  t: (key: string) => string;
  data: unknown[][];
  menuPosition?: MenuPosition | null;
  handleClose: () => void;
  onCellsChanged: (changes: CellChange[], additions: CellChange[]) => void;
}

const PasteFromClipboard = ({
  t,
  data,
  menuPosition,
  handleClose,
  onCellsChanged,
}: PasteFromClipboardProps) => {
  const [cell, setCell] = React.useState<Partial<MenuPosition>>({});

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

    const { i, j } = cell as MenuPosition;

    const changes: CellChange[] = [];
    const addition: CellChange[] = [];

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
