import React from 'react';
import { useTranslate } from 'react-translate';
import makeStyles from '@mui/styles/makeStyles';
import BottomSheet from 'react-draggable-bottom-sheet';
import 'react-draggable-bottom-sheet/dist/index.css';
import classNames from 'classnames';
import { IconButton, Typography, ClickAwayListener } from '@mui/material';
import { ReactComponent as AddRowBelowIcon } from 'assets/img/cntxAddRowBelowIcon.svg';
import { ReactComponent as AddRowAboveIcon } from 'assets/img/add_row_above.svg';
import { ReactComponent as DeleteIcon } from 'assets/img/cntxDeleteIcon.svg';
import { ReactComponent as DuplicateIcon } from 'assets/img/cntxDuplicateIcon.svg';
import { ReactComponent as EditIcon } from 'assets/img/ic_edit.svg';
import { ReactComponent as ApplyIcon } from 'assets/img/check.svg';

const styles = () => ({
  contextMenuWrapper: {
    width: '100%',
    minHeight: 117,
    backgroundColor: 'rgba(255, 255, 255, 1)',
    boxShadow: '0px 2px 6px 2px rgba(60, 64, 67, 0.15)',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  bottomSeparator: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 8,
    paddingBottom: 8,
    paddingRight: 8,
    borderBottom: '1px solid rgba(217, 217, 217, 1)',
    marginBottom: 8,
    '& p': {
      color: 'rgba(68, 68, 68, 1)',
      fontSize: 11,
      lineWeight: '14px',
    },
  },
  rightSeparator: {
    display: 'flex',
    paddingRight: 8,
    justifyContent: 'space-between',
    borderRight: '1px solid rgba(217, 217, 217, 1)',
  },
  pl8: {
    paddingLeft: 8,
  },
  actionsFlex: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 8px',
  },
  actionsInnerFlex: {
    display: 'flex',
    justifyContent: 'space-between',
  },
});

const useStyles = makeStyles(styles);

const ContextMenu = ({
  activeCell,
  setActiveCell,
  activeCellRef,
  value,
  handleChange,
}) => {
  const t = useTranslate('Elements');
  const classes = useStyles();
  const [opened, setOpened] = React.useState(true);

  const { col, row } = React.useMemo(() => activeCell || {}, [activeCell]);

  const blurEvent = React.useCallback(() => {
    setOpened(true);
  }, []);
  const focusEvent = React.useCallback(() => {
    setOpened(false);
  }, []);
  const keyDownEvent = React.useCallback((event) => {
    if (event.key.toLowerCase() === 'backspace' && !event.target.value) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (event.key.toLowerCase() === 'enter') {
      event.preventDefault();
      event.stopPropagation();
      event.target.blur();
    }
  }, []);

  const handleApply = React.useCallback(() => {
    const path = `${col}${row}`;
    const input = activeCellRef[path].current;
    input.removeEventListener('blur', blurEvent);
    input.removeEventListener('focus', focusEvent);
    input.removeEventListener('keydown', keyDownEvent);
    setActiveCell(null);
  }, [
    setActiveCell,
    activeCellRef,
    col,
    row,
    blurEvent,
    focusEvent,
    keyDownEvent,
  ]);

  const handleEditCell = React.useCallback(() => {
    const path = `${col}${row}`;
    const input = activeCellRef[path].current;
    if (input) {
      const scrollTop =
        document.documentElement.scrollTop || document.body.scrollTop;
      input.setAttribute('enterKeyHint', 'done');
      window.scrollTo(0, scrollTop + 117);
      input.addEventListener('blur', blurEvent);
      input.addEventListener('focus', focusEvent);
      input.addEventListener('keydown', keyDownEvent);
      input.focus();
      setTimeout(() => {
        input.focus();
      }, 100);
    }
  }, [
    col,
    row,
    activeCellRef,
    activeCell,
    blurEvent,
    focusEvent,
    keyDownEvent,
  ]);

  const handleAddRowAbove = React.useCallback(() => {
    const newValue = [...value];
    newValue.splice(row, 0, {});
    handleChange(newValue);
    handleApply();
  }, [row, value, handleApply, handleChange]);

  const handleAddRowBelow = React.useCallback(() => {
    const newValue = [...value];
    newValue.splice(row + 1, 0, {});
    handleChange(newValue);
    handleApply();
  }, [row, value, handleApply, handleChange]);

  const handleDeleteRow = React.useCallback(() => {
    const newValue = [...value];
    newValue.splice(row, 1);
    handleChange(newValue);
    handleApply();
  }, [row, value, handleApply, handleChange]);

  const handleDuplicateRow = React.useCallback(() => {
    const newValue = [...value];
    newValue.splice(row, 0, newValue[row]);
    handleChange(newValue);
    handleApply();
  }, [row, value, handleApply, handleChange]);

  return (
    <ClickAwayListener onClickAway={handleApply}>
      <BottomSheet
        isOpen={!!activeCell && opened}
        close={handleApply}
        classNames={classes.dragWrapper}
      >
        <div className={classes.contextMenuWrapper}>
          <div className={classes.bottomSeparator}>
            <Typography>{t('EditCell')}</Typography>
            <IconButton onClick={handleEditCell}>
              <EditIcon />
            </IconButton>
          </div>
          <div className={classes.actionsFlex}>
            <div className={classes.actionsInnerFlex}>
              <div className={classes.rightSeparator}>
                <IconButton onClick={handleAddRowAbove}>
                  <AddRowAboveIcon />
                </IconButton>
                <IconButton onClick={handleAddRowBelow}>
                  <AddRowBelowIcon />
                </IconButton>
              </div>
              <div className={classNames(classes.rightSeparator, classes.pl8)}>
                <IconButton onClick={handleDeleteRow}>
                  <DeleteIcon />
                </IconButton>
                <IconButton onClick={handleDuplicateRow}>
                  <DuplicateIcon />
                </IconButton>
              </div>
            </div>
            <IconButton>
              <ApplyIcon onClick={handleApply} />
            </IconButton>
          </div>
        </div>
      </BottomSheet>
    </ClickAwayListener>
  );
};

export default ContextMenu;
