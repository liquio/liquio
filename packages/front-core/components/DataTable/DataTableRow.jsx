import React, { useState, useRef } from 'react';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import objectPath from 'object-path';
import CheckBoxOutlinedIcon from '@mui/icons-material/CheckBoxOutlined';
import { TableCell, TableRow, Checkbox, Popover } from '@mui/material';
import withStyles from '@mui/styles/withStyles';

import RenderOneLine from 'helpers/renderOneLine';

const styles = (theme) => ({
  selected: {
    backgroundColor: `${theme.dataTableHoverBg}!important`
  },
  hover: {
    '&:hover': {
      '& td': {
        color: `${theme.dataTableHoverColor}!important`
      }
    }
  },
  clickable: {
    cursor: 'pointer'
  },
  tableCell: {
    minWidth: 50,
    [theme.breakpoints.down('md')]: {
      padding: 15,
      fontSize: 13,
      lineHeight: '18px'
    },
    ...(theme.tableCell || {})
  },
  hightlight: {
    backgroundColor: theme.dataTableHighlights || '#FFFCE5'
  },
  fullscreenCell: {
    '& > div': {
      position: 'static'
    },
    '& > div > button': {
      position: 'static'
    }
  },
  checkBoxRoot: {
    padding: 0,
    position: 'relative',
    left: 0,
    top: 7,
    backgroundColor: 'transparent!important'
  },
  cellDark: {
    borderBottom: theme?.header?.borderBottom,
    padding: '14px 12px'
  },
  checkBoxRootDarkChecked: {
    '& svg': {
      fill: theme.buttonBg
    }
  },
  alignError: {
    verticalAlign: 'top'
  },
  error: {
    '& td': {
      color: '#f44336'
    }
  },
  warning: {
    '& *': {
      color: '#ffeb3b'
    }
  },
  disabledRow: {
    ...(theme.disabledRow || {})
  }
});

const Cell = ({
  id,
  render,
  item,
  rowIndex,
  handleClick,
  disableClick,
  classes,
  columnKey,
  cellStyle = {},
  onClick,
  editPopupMode,
  disableEditPopup,
  cellColor,
  fullscreen,
  darkTheme,
  disableTooltip,
  maxTextRows,
  minWidthCustom,
  errors,
  path,
  ...rest
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const onClickAction = (props) => {
    onClick && onClick(props);
    setOpen(true);
  };

  const anchorEl = containerRef && containerRef.current;

  const tableCellStyle = { ...(cellStyle || {}) };

  if (cellColor) {
    tableCellStyle.backgroundColor = cellColor(item, id);
  }

  const dataValue = id ? objectPath.get(item, id) : null;
  const cellValue =
    typeof render === 'function' ? render(dataValue, item, columnKey, rowIndex, id) : dataValue;

  let pathCell = path || [];

  pathCell = pathCell.concat(rowIndex, id).join('.');

  const errorCell = errors?.find((error) => error.path === pathCell);

  const firstItemProps = {
    component: 'th',
    scope: 'row'
  };

  return (
    <>
      <TableCell
        style={tableCellStyle}
        className={classNames({
          [classes.tableCell]: true,
          [classes.fullscreenCell]: fullscreen,
          [classes.cellDark]: darkTheme,
          [classes.alignError]: errors?.length > 0 && !errorCell
        })}
        {...rest}
        key={columnKey}
        ref={containerRef}
        {...(columnKey === 0 ? firstItemProps : {})}
        onClick={disableClick ? null : handleClick ? handleClick(item).bind(this) : onClickAction}
      >
        <RenderOneLine
          id={id}
          title={cellValue}
          disableTooltip={disableTooltip}
          maxTextRows={maxTextRows}
          minWidthCustom={minWidthCustom}
        />
      </TableCell>
      {editPopupMode && !disableEditPopup ? (
        <Popover
          open={open}
          anchorEl={anchorEl}
          onClose={() => setOpen(false)}
          PaperProps={{
            style: {
              padding: 5,
              boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.2)'
            }
          }}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'left'
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left'
          }}
        >
          {render ? render(item[id], item, columnKey, rowIndex, open) : item[id]}
        </Popover>
      ) : null}
    </>
  );
};

const DataTableRow = ({
  t,
  classes,
  rowIndex,
  item,
  selected,
  hightlight,
  checkable,
  columns,
  hiddenColumns,
  onClick,
  onSelect,
  cellStyle,
  editPopupMode,
  disableEditPopup,
  cellColor,
  fullscreen,
  hover,
  darkTheme,
  maxTextRows,
  errors,
  warningRows,
  errorRows,
  disabled
}) => (
  <TableRow
    hover={hover}
    selected={selected}
    classes={{
      hover: classNames({
        [classes.hover]: true
      }),
      selected: classes.selected
    }}
    className={classNames({
      [classes.clickable]: !!onClick,
      [classes.hightlight]: hightlight,
      [classes.rowDark]: darkTheme,
      [classes.warning]: warningRows?.includes(rowIndex),
      [classes.error]: errorRows?.includes(rowIndex),
      [classes.disabledRow]: disabled
    })}
  >
    {checkable ? (
      <TableCell
        style={{
          ...cellStyle,
          textAlign: 'left'
        }}
        align="center"
        padding="checkbox"
        className={classNames({
          [classes.cellDark]: darkTheme
        })}
      >
        <Checkbox
          checkedIcon={<CheckBoxOutlinedIcon />}
          checked={selected}
          disabled={disabled}
          onChange={onSelect}
          disableRipple={true}
          classes={{
            root: classNames({
              [classes.checkBoxRootDark]: darkTheme
            }),
            checked: classNames({
              [classes.checkBoxRootDarkChecked]: darkTheme
            })
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation();
              e.preventDefault();
              onSelect(e);
            }
          }}
          inputProps={{
            'aria-label': t('CheckboxButton')
          }}
        />
      </TableCell>
    ) : null}
    {columns
      .filter((column) => !(hiddenColumns || []).includes(column.id))
      .map(({ id, render, handleClick, disableClick, path, ...rest }, columnKey) => (
        <Cell
          key={columnKey}
          cellColor={cellColor}
          id={id}
          item={item}
          rowIndex={rowIndex}
          render={render}
          onClick={onClick}
          errors={errors}
          path={path}
          cellStyle={cellStyle}
          handleClick={handleClick}
          disableClick={disableClick}
          columnKey={columnKey}
          classes={classes}
          editPopupMode={editPopupMode}
          disableEditPopup={disableEditPopup}
          fullscreen={fullscreen}
          darkTheme={darkTheme}
          maxTextRows={maxTextRows}
          {...rest}
        />
      ))}
  </TableRow>
);

DataTableRow.propTypes = {
  classes: PropTypes.object.isRequired,
  selected: PropTypes.bool,
  hightlight: PropTypes.bool,
  selectable: PropTypes.bool,
  checkable: PropTypes.bool,
  columns: PropTypes.array,
  editPopupMode: PropTypes.bool,
  disableEditPopup: PropTypes.bool,
  hover: PropTypes.bool,
  warningRows: PropTypes.array
};

DataTableRow.defaultProps = {
  selected: false,
  hightlight: false,
  selectable: false,
  checkable: false,
  columns: [],
  editPopupMode: false,
  disableEditPopup: false,
  hover: true,
  warningRows: []
};

export default withStyles(styles)(DataTableRow);
