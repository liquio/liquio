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
import { JsonSchemaNode } from '../../types';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    maxHeight: 160,
    height: 33,
    textAlign: 'left' as const,
    '& > .value-viewer': {
      wordBreak: 'normal' as const,
    },
  },
  cell: {
    position: 'relative' as const,
    // whiteSpace: 'normal !important',
    whiteSpace: 'inherit !important',
    minWidth: 160,
    maxWidth: 200,
    overflowX: 'visible !important' as never,
    // maxHeight: 44,
    borderColor: '#E8EEF2 !important',
    '&.read-only': {
      whiteSpace: 'initial !important',
      paddingRight: 5,
      paddingLeft: 5,
    },
    '& .value-viewer': {
      padding: '0 4px',
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      // maxHeight: 44,
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical' as const,
      flex: 1,
      '&::after': {
        content: '""',
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
    position: 'absolute' as const,
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
    fontWeight: 'bold' as const,
    fontSize: 12,
  },
})(Tooltip);

interface CellErrorItem {
  path: string;
  [key: string]: unknown;
}

interface SheetCellProps {
  row: number;
  col: number;
  children?: React.ReactNode;
  path: Array<string | number>;
  errors?: CellErrorItem[];
  readOnly?: boolean;
  parentValue?: Record<string, unknown[]>;
  stepName?: string;
  className?: string;
  onChange: (event: { value: unknown; row: number; propName: string }) => void;
  cell?: { value?: unknown };
  items?: { properties?: Record<string, JsonSchemaNode> };
  headers: Array<Array<{ align?: string } | string>>;
  onContextMenu?: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseOver?: (e: React.MouseEvent) => void;
  editing?: boolean;
  [key: string]: unknown;
}

const SheetCell = (props: SheetCellProps) => {
  const {
    row,
    col,
    children,
    path,
    errors = [],
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

  const cellRef = React.useRef(null);

  const propNames = Object.keys(properties);
  const propName = propNames[col];
  const schema = properties[propName] as JsonSchemaNode & { control?: string; options?: unknown; readOnly?: boolean; required?: string[] };
  const lastHeader = headers.length ? headers[headers.length - 1] : [];
  const headerProps = (lastHeader[col] || {}) as { align?: string };

  const error = errors.find(
    ({ path: errorPath }) => errorPath === [path, row, propName].join('.'),
  );
  const [message] = getMessages(
    schema as never,
    ([] as unknown[]).concat(stepName, path, row, propName) as Array<string | number>,
    {
      ...(props as unknown as { rootDocument: { data: Record<string, unknown> } }),
      value,
    },
  );

  const isList = React.useMemo(
    () => !schema.control && schema.type === 'string' && !!schema.options,
    [schema],
  );

  const isDropDownList =
    !editing && !isList && listControls.includes(schema.control as string);

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
      onChange={(newValue: unknown) => onChange({ value: newValue, row, propName })}
    />
  ) : null;

  const sheetCell = (
    <td
      ref={cellRef}
      tabIndex={0}
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
        textAlign: (headerProps.align as never) || 'center',
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
              ? `${MESSAGE_TYPES[message.type as keyof typeof MESSAGE_TYPES].color}25`
              : undefined,
          }}
        >
          {dataEditor || children}
          {isDropDownList ? (
            <ArrowDropDownIcon className={(classes as unknown as { dropDownIcon?: string }).dropDownIcon} />
          ) : null}
          {value ? (
            <div
              className={classNames(classes.copier, 'copier')}
              {...({ dataRole: 'copier', dataValue: value } as Record<string, unknown>)}
            />
          ) : null}
          {message ? (
            <FormControlMessage message={message} size="small">
              {null}
            </FormControlMessage>
          ) : null}
        </div>
      </CellTooltip>
    </td>
  );

  return error ? (
    <CustomTooltip title={<EJVError error={error as never} />} placement="top">
      {sheetCell}
    </CustomTooltip>
  ) : (
    sheetCell
  );
};

export default SheetCell;
