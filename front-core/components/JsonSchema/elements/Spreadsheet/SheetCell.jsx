import React, { Children, isValidElement, cloneElement } from 'react';
import classNames from 'classnames';
import { Tooltip } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import SchemaPreview from 'components/JsonSchema/SchemaPreview';
import EJVError from 'components/JsonSchema/components/EJVError';
import getMessages from 'components/JsonSchema/helpers/getMessages';
import FormControlMessage, {
  MESSAGE_TYPES,
} from 'components/JsonSchema/components/FormControlMessage';

const styles = {
  root: {
    display: 'flex',
    alignItems: 'baseline',
    maxHeight: 160,
    overflow: 'auto',
  },
  cell: {
    position: 'relative',
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
      whiteSpace: 'normal',
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
};

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
    actions,
    classes,
    row,
    col,
    children,
    path,
    errors,
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

  const selected = dataListRef?.current?.querySelector('td.selected');

  const sheetCell = (
    <td
      ref={cellRef}
      tabIndex="0"
      row={row}
      col={col}
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
        textAlign: headerProps.align || 'center',
        wordBreak: 'break-word',
        color: '#000',
        outline: selected ? 'none' : 'revert',
        width: headerProps.width || 'auto',
      }}
    >
      <div
        className={classes.root}
        style={{
          background: message ? `${MESSAGE_TYPES[message.type].color}25` : null,
        }}
      >
        <SchemaPreview
          value={value}
          schema={schema}
          actions={actions}
          defaultPreview={Children.map(children, (child) => {
            if (isValidElement(child)) {
              return cloneElement(child, { cellRef });
            }

            return child;
          })}
        />
        {value ? (
          <div
            className={classNames(classes.copier, 'copier')}
            dataRole="copier"
            dataValue={value}
          />
        ) : null}
        {message ? <FormControlMessage message={message} size="small" /> : null}
      </div>
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

export default withStyles(styles)(SheetCell);
