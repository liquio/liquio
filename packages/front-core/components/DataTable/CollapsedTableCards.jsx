import React from 'react';
import { IconButton, TableRow, TableCell, ImageList, Table, TableBody } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';

const styles = {
  row: {
    cursor: 'pointer'
  },
  cardContainer: {
    padding: '8px 0 0 8px',
    margin: '0 !important'
  }
};

const CollapsedTableCards = ({ classes, title, data, renderCard }) => {
  const [open, setOpen] = React.useState(true);

  if (!data || !data.length) {
    return null;
  }

  return (
    <>
      <Table>
        <TableBody>
          <TableRow hover={true} className={classes.row} onClick={() => setOpen(!open)}>
            <TableCell>
              <IconButton size="large">
                {open ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />}
              </IconButton>
              {`${title}${open ? '' : ' (' + data.length + ')'}`}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      {open ? (
        <>
          <ImageList className={classes.cardContainer}>{data.map(renderCard)}</ImageList>
        </>
      ) : null}
    </>
  );
};

export default withStyles(styles)(CollapsedTableCards);
