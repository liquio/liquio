import React from 'react';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { Button, Popover, Paper } from '@mui/material';
import RenderOneLine from 'helpers/renderOneLine';

const RenderPopup = ({ filter, classes, children, actionsBlock }) => {
  const [filterOpen, setFilterOpen] = React.useState(false);
  const ref = React.useRef(null);

  const memoiseHandleOpen = React.useCallback(() => {
    setFilterOpen(true);
  }, []);

  const memoiseHandleClose = React.useCallback(() => {
    setFilterOpen(false);
  }, []);

  const updateChildren = React.cloneElement(children, {
    isPopup: true,
  });

  return (
    <>
      <Button
        ref={ref}
        className={classes.popupButton}
        onClick={memoiseHandleOpen}
        endIcon={<ArrowDropDownIcon />}
        aria-label={filter?.actionText || filter?.description}
      >
        <RenderOneLine title={filter?.actionText || filter?.description} />
      </Button>

      <Popover
        anchorEl={ref.current}
        open={filterOpen}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        onClose={memoiseHandleClose}
      >
        <Paper className={classes.paper}>
          {updateChildren}
          {actionsBlock(memoiseHandleClose)}
        </Paper>
      </Popover>
    </>
  );
};

export default RenderPopup;
