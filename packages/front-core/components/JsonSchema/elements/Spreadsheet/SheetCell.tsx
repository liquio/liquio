import React, { Children, isValidElement, cloneElement } from 'react';
import classNames from 'classnames';
import { Tooltip } from '@mui/material';
import withStyles, { WithStyles } from '@mui/styles/withStyles';
import SchemaPreviewUntyped from 'components/JsonSchema/SchemaPreview';
import EJVError from 'components/JsonSchema/components/EJVError';
import getMessages from 'components/JsonSchema/helpers/getMessages';
import FormControlMessage, {
  MESSAGE_TYPES,
} from 'components/JsonSchema/components/FormControlMessage';
import { JsonSchemaNode } from '../../types';

const SchemaPreview = SchemaPreviewUntyped as unknown as React.ComponentType<Record<string, unknown>>;

const styles = {
  root: {
    display: 'flex',
    alignItems: 'baseline' as const,
    maxHeight: 160,
    overflow: 'auto',
  },
  cell: {
    position: 'relative' as const,
    // whiteSpace: 'normal !important',
    whiteSpace: 'inherit !important',
    minWidth: 110,
    // maxHeight: 44,
    '&.read-only': {
      whiteSpace: 'initial !important',
      paddingRight: 5,
      paddingLeft: 5,
    },
    '& .value-viewer': {
      padding: '0 4px',
      whiteSpace: 'normal' as const,
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
};

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

interface SheetCellProps extends WithStyles<typeof styles> {
  actions?: unknown;
  row: number;
  col: number;
  children?: React.ReactNode;
  path: Array<string | number>;
  errors?: CellErrorItem[];
  stepName?: string;
  className?: string;
  cell?: { value?: unknown };
  items?: { properties?: Record<string, JsonSchemaNode> };
  schema: { headers?: Array<Array<{ align?: string; width?: string | number } | string>> };
  onContextMenu?: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseOver?: (e: React.MouseEvent) => void;
  dataListRef?: React.RefObject<HTMLElement>;
  [key: string]: unknown;
}

const SheetCell = (props: SheetCellProps) => {
  const {
    actions,
    classes,
    row,
    col,
    children,
    path,
    errors = [],
    stepName,
    className,
    cell: { value } = {},
    items: { properties = {} } = {},
    schema: { headers = [] },
    onContextMenu,
    onDoubleClick,
    onMouseDown,
    onMouseOver,
    dataListRef,
  } = props;

  const cellRef = React.useRef(null);

  const propNames = Object.keys(properties);
  const propName = propNames[col];
  const schema = properties[propName] as JsonSchemaNode;
  const lastHeader = headers.length ? headers[headers.length - 1] : [];
  const headerProps = (lastHeader[col] || {}) as { align?: string; width?: string | number };

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

  const selected = dataListRef?.current?.querySelector('td.selected');

  const sheetCell = (
    <td
      ref={cellRef}
      tabIndex={0}
      {...({ row, col } as Record<string, unknown>)}
      id={[path, row, propName].join('-')}
      onContextMenu={onContextMenu}
      onDoubleClick={onDoubleClick}
      onMouseDown={onMouseDown}
      onMouseOver={onMouseOver}
      className={classNames(className, {
        [classes.cell]: true,
        [classes.error]: !!error,
      })}
      style={{
        verticalAlign: 'middle',
        textAlign: (headerProps.align as never) || 'center',
        wordBreak: 'break-word',
        color: '#000',
        outline: selected ? 'none' : 'revert',
        width: headerProps.width || 'auto',
      }}
    >
      <div
        className={classes.root}
        style={{
          background: message ? `${MESSAGE_TYPES[message.type as keyof typeof MESSAGE_TYPES].color}25` : undefined,
        }}
      >
        <SchemaPreview
          value={value}
          schema={schema}
          actions={actions}
          defaultPreview={Children.map(children, (child) => {
            if (isValidElement(child)) {
              return cloneElement(child, { cellRef } as never);
            }

            return child;
          })}
        />
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

export default withStyles(styles)(SheetCell);
