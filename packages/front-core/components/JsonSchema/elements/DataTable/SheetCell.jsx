import React from 'react';
import classNames from 'classnames';
import { Tooltip } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { makeStyles } from '@mui/styles';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

import { SchemaForm } from 'components/JsonSchema';
import EJVError from 'components/JsonSchema/components/EJVError';
import getMessages from 'components/JsonSchema/helpers/getMessages';
import CellTooltip from 'components/JsonSchema/elements/DataTable/CellTooltip';
import FormControlMessage, {
  MESSAGE_TYPES,
} from 'components/JsonSchema/components/FormControlMessage';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    maxHeight: 160,
    height: 33,
    textAlign: 'left',
    '& > .value-viewer': {
      wordBreak: 'normal',
    },
  },
  cell: {
    position: 'relative',
    // whiteSpace: 'normal !important',
    whiteSpace: 'inherit !important',
    minWidth: 160,
    maxWidth: 200,
    overflowX: 'visible !important',
    // maxHeight: 44,
    borderColor: '#E8EEF2 !important',
    '&.read-only': {
      whiteSpace: 'initial !important',
      paddingRight: 5,
      paddingLeft: 5,
    },
    '& .value-viewer': {
      padding: '0 4px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      // maxHeight: 44,
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical',
      flex: 1,
      '&::after': {
        content: '',
        display: 'block',
      },
    },
    '& .copier': {
      display: 'none',
    },
    '&.selected .copier': {
      display: 'block',
    },
  },
  error: {
    background: '#fdb59c !important',
  },
  copier: {
    position: 'absolute',
    cursor: 'default',
    width: 6,
    height: 6,
    background: '#000000',
    right: 0,
    bottom: 0,
  },
  cellContainer: {
    maxHeight: 100,
    overflow: 'hidden',
  },
});

const listControls = ['register', 'custom.data.select'];

const CustomTooltip = withStyles({
  tooltip: {
    color: '#c8221a',
    backgroundColor: '#f1b992',
    opacity: 0.7,
    fontWeight: 'bold',
    fontSize: 12,
  },
})(Tooltip);

const SheetCell = (props) => {
  const {
    row,
    col,
    children,
    path,
    errors,
    readOnly,
    parentValue,
    stepName,
    className,
    onChange,
    cell: { value } = {},
    items: { properties = {} } = {},
    headers,
    onContextMenu,
    onDoubleClick,
    onMouseDown,
    onMouseOver,
    editing,
  } = props;

  const classes = useStyles();

  const cellRef = React.useRef();

  const propNames = Object.keys(properties);
  const propName = propNames[col];
  const schema = properties[propName];
  const lastHeader = headers.length ? headers[headers.length - 1] : [];
  const headerProps = lastHeader[col] || {};

  const error = errors.find(
    ({ path: errorPath }) => errorPath === [path, row, propName].join('.'),
  );
  const [message] = getMessages(
    schema,
    [].concat(stepName, path, row, propName),
    {
      ...props,
      value,
    },
  );

  const isList = React.useMemo(
    () => !schema.control && schema.type === 'string' && schema.options,
    [schema],
  );

  const isDropDownList =
    !editing && !isList && listControls.includes(schema.control);

  const dataEditor = isList ? (
    <SchemaForm
      {...schema}
      value={value}
      name={propName}
      width="100%"
      fullWidth={true}
      noMargin={true}
      multiline={false}
      usedInTable={true}
      useOwnContainer={true}
      className="dataTable-cell"
      path={path.concat(row, propName)}
      readOnly={readOnly || schema.readOnly}
      schema={{ ...schema, description: '' }}
      required={(schema.required || []).includes(propName)}
      parentValue={parentValue && parentValue[row]}
      onChange={(newValue) => onChange({ value: newValue, row, propName })}
    />
  ) : null;

  const sheetCell = (
    <td
      ref={cellRef}
      tabIndex="0"
      id={[path, row, propName].join('-')}
      onContextMenu={onContextMenu}
      onDoubleClick={onDoubleClick}
      onMouseDown={onMouseDown}
      onMouseOver={onMouseOver}
      className={classNames(className, classes.cell, {
        [classes.error]: !!error,
      })}
      style={{
        verticalAlign: 'middle',
        textAlign: headerProps.align || 'center',
        wordBreak: 'break-word',
        color: '#000',
        outline: 'none',
      }}
    >
      <CellTooltip
        title={editing || !value ? null : children}
        placement="bottom"
      >
        <div
          className={classes.root}
          style={{
            background: message
              ? `${MESSAGE_TYPES[message.type].color}25`
              : null,
          }}
        >
          {dataEditor || children}
          {isDropDownList ? (
            <ArrowDropDownIcon className={classes.dropDownIcon} />
          ) : null}
          {value ? (
            <div
              className={classNames(classes.copier, 'copier')}
              dataRole="copier"
              dataValue={value}
            />
          ) : null}
          {message ? (
            <FormControlMessage message={message} size="small" />
          ) : null}
        </div>
      </CellTooltip>
    </td>
  );

  return error ? (
    <CustomTooltip title={<EJVError error={error} />} placement="top">
      {sheetCell}
    </CustomTooltip>
  ) : (
    sheetCell
  );
};

export default SheetCell;
