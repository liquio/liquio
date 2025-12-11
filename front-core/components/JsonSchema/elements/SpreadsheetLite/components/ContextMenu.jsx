import React from 'react';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import makeStyles from '@mui/styles/makeStyles';
import { ReactComponent as AddRowBelowIcon } from 'assets/img/cntxAddRowBelowIcon.svg';
import { ReactComponent as DeleteIcon } from 'assets/img/cntxDeleteIcon.svg';
import { ReactComponent as DuplicateIcon } from 'assets/img/cntxDuplicateIcon.svg';
import { ReactComponent as AddRowAboveIcon } from 'assets/img/add_row_above.svg';

const styles = () => ({
  list: {},
  item: {
    cursor: 'pointer',
  },
  button: {
    paddingLeft: 10,
    paddingRight: 10,
  },
  text: {
    '& span': {
      fontSize: 13,
      lineHeight: '18px',
    },
  },
  icon: {
    minWidth: 32,
  },
});

const useStyles = makeStyles(styles);

const ICONS = {
  INSERT_ROW_ABOVE: <AddRowAboveIcon />,
  INSERT_ROW_BELLOW: <AddRowBelowIcon />,
  DUPLICATE_ROW: <DuplicateIcon />,
  DELETE_ROW: <DeleteIcon />,
};

const ACTIONS = [
  'INSERT_ROW_ABOVE',
  'INSERT_ROW_BELLOW',
  'DUPLICATE_ROW',
  'DELETE_ROW',
];

const ContextMenu = ({ t, value, handleChange, event }) => {
  const classes = useStyles();

  const { clientX, clientY, items = [], close, cursorIndex } = event || {};

  const handleAddRowAbove = React.useCallback(() => {
    if (!cursorIndex || cursorIndex.row === null) return;
    const newValue = [...value];
    newValue.splice(cursorIndex.row, 0, {});
    handleChange(newValue);
    close();
  }, [cursorIndex, value, close, handleChange]);

  const getAction = React.useCallback(
    (type) => {
      const action = items.find((item) => item.type === type);
      return action?.action ? action.action() : null;
    },
    [items],
  );

  React.useEffect(() => {
    if (items && !items.find((item) => item.type === 'INSERT_ROW_ABOVE')) {
      items.push({ type: 'INSERT_ROW_ABOVE', action: handleAddRowAbove });
    }
  }, [items, handleAddRowAbove]);

  React.useEffect(() => {
    const handleContextMenu = (event) => {
      event.preventDefault();
    };

    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  if (!clientX || !clientY) {
    return null;
  }

  return (
    <ClickAwayListener onClickAway={close}>
      <Box
        sx={{
          position: 'fixed',
          top: clientY,
          left: clientX,
          backgroundColor: '#fff',
          zIndex: 1000,
          borderRadius: 1,
          maxWidth: 360,
          boxShadow: '0px 2px 6px 2px rgba(60, 64, 67, 0.15)',
        }}
      >
        <List className={classes.list}>
          {ACTIONS.map((action) => (
            <ListItem key={action} className={classes.item} disablePadding>
              <ListItemButton
                className={classes.button}
                onClick={() => getAction(action)}
              >
                <ListItemIcon className={classes.icon}>
                  {ICONS[action] || null}
                </ListItemIcon>
                <ListItemText className={classes.text} primary={t(action)} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </ClickAwayListener>
  );
};

export default ContextMenu;
