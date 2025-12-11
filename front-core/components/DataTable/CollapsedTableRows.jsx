import React from 'react';
import { IconButton, TableRow, TableCell } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';

const styles = {
  row: {
    cursor: 'pointer'
  }
};

const CollapsedTableRows = ({ classes, title, data, colSpan, renderRow }) => {
  const [open, setOpen] = React.useState(true);

  if (!data || !data.length) {
    return null;
  }

  return (
    <>
      <TableRow hover={true} className={classes.row} onClick={() => setOpen(!open)}>
        <TableCell colSpan={colSpan}>
          <IconButton size="large">{open ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />}</IconButton>
          {`${title}${open ? '' : ' (' + data.length + ')'}`}
        </TableCell>
      </TableRow>
      {open ? data.map(renderRow) : null}
    </>
  );
};

export default withStyles(styles)(CollapsedTableRows);
