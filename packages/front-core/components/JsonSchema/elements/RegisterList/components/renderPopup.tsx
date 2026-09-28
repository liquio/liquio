import React from 'react';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { Button, Popover, Paper } from '@mui/material';
import RenderOneLine from 'helpers/renderOneLine';

interface RenderPopupProps {
  filter?: {
    actionText?: string;
    description?: string;
  };
  classes: {
    popupButton: string;
    paper: string;
  };
  children: React.ReactElement<{ isPopup?: boolean }>;
  actionsBlock: (close: () => void) => React.ReactNode;
}

const RenderPopup = ({
  filter,
  classes,
  children,
  actionsBlock,
}: RenderPopupProps) => {
  const [filterOpen, setFilterOpen] = React.useState(false);
  const ref = React.useRef<HTMLButtonElement>(null);

  const handleOpen = React.useCallback(() => setFilterOpen(true), []);
  const handleClose = React.useCallback(() => setFilterOpen(false), []);
  const updatedChildren = React.cloneElement(children, { isPopup: true });
  const title = filter?.actionText || filter?.description;

  return (
    <>
      <Button
        ref={ref}
        className={classes.popupButton}
        onClick={handleOpen}
        endIcon={<ArrowDropDownIcon />}
        aria-label={title}
      >
        <RenderOneLine title={title} />
      </Button>

      <Popover
        anchorEl={ref.current}
        open={filterOpen}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        onClose={handleClose}
      >
        <Paper className={classes.paper}>
          {updatedChildren}
          {actionsBlock(handleClose)}
        </Paper>
      </Popover>
    </>
  );
};

export default RenderPopup;
