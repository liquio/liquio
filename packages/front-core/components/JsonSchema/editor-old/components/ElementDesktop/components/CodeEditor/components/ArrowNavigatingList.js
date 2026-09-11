import React, { useEffect, useState } from 'react';
import { Paper, TextField } from '@mui/material';
import { makeStyles } from '@mui/styles';
import classNames from 'classnames';

const useStyles = makeStyles((theme) => ({
  paper: {
    position: 'absolute',
    background: '#fff',
    zIndex: 1000,
    maxHeight: 300,
    overflow: 'auto',
    borderRadius: 0,
  },
  suggestText: {
    color: '#fff',
    background: theme?.header?.background,
    cursor: 'pointer',
    '&:hover': {
      opacity: 0.7,
    },
  },
  suggestionList: {
    minWidth: 200,
    paddingTop: 10,
    paddingBottom: 10,
    background:
      'linear-gradient(0deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.12)), #121212',
  },
  listItem: {
    color: '#fff',
    background: theme?.header?.background,
    cursor: 'pointer',
    padding: 10,
  },
  listItemActive: {
    opacity: 0.6,
  },
  hidden: {
    height: 0,
    opacity: 0,
  },
}));

const useKeyPress = function (targetKey) {
  const [keyPressed, setKeyPressed] = React.useState(false);

  React.useEffect(() => {
    const downHandler = ({ key }) => {
      if (key === targetKey) {
        setKeyPressed(true);
      }
    };

    const upHandler = ({ key }) => {
      if (key === targetKey) {
        setKeyPressed(false);
      }
    };

    window.addEventListener('keydown', downHandler);
    window.addEventListener('keyup', upHandler);

    return () => {
      window.removeEventListener('keydown', downHandler);
      window.removeEventListener('keyup', upHandler);
    };
  }, [targetKey]);

  return keyPressed;
};

const ListItem = ({ item, active, setHovered, classes, handleSelect }) => (
  <div
    className={classNames({
      [classes.listItem]: true,
      [classes.listItemActive]: active,
    })}
    onClick={() => handleSelect(item.name)}
    onMouseEnter={() => setHovered(item)}
    onMouseLeave={() => setHovered(undefined)}
  >
    <span>{item.name}</span>
  </div>
);

const ListExample = ({
  list,
  handleSelect,
  position,
  handleClose,
  autoFocus,
}) => {
  const downPress = useKeyPress('ArrowDown');
  const upPress = useKeyPress('ArrowUp');
  const enterPress = useKeyPress('Enter');
  const escapePress = useKeyPress('Escape');

  const [cursor, setCursor] = useState(0);
  const [hovered, setHovered] = useState(undefined);

  const classes = useStyles();

  const items = list.map((id) => ({
    id,
    name: id,
  }));

  useEffect(() => {
    if (items.length && downPress) {
      setCursor((prevState) =>
        prevState < items.length - 1 ? prevState + 1 : prevState,
      );
    }
  }, [downPress, items.length]);

  useEffect(() => {
    if (items.length && upPress) {
      setCursor((prevState) => (prevState > 0 ? prevState - 1 : prevState));
    }
  }, [items.length, upPress]);

  useEffect(() => {
    if (items.length && enterPress) {
      handleSelect(items[cursor]?.name);
    }
  }, [cursor, enterPress, handleSelect, items]);

  useEffect(() => {
    if (items.length && hovered) {
      setCursor(items.indexOf(hovered));
    }
  }, [hovered, items]);

  useEffect(() => {
    if (escapePress) {
      handleClose();
    }
  }, [escapePress, handleClose]);

  return (
    <Paper
      style={position}
      className={classNames({
        [classes.suggestionList]: true,
        [classes.paper]: true,
      })}
    >
      {autoFocus ? (
        <TextField
          value="some value"
          autoFocus={true}
          className={classes.hidden}
        />
      ) : null}

      {items.map((item, i) => (
        <ListItem
          key={item.id}
          active={i === cursor}
          item={item}
          setHovered={setHovered}
          classes={classes}
          handleSelect={handleSelect}
        />
      ))}
    </Paper>
  );
};

export { useKeyPress };

export default ListExample;
