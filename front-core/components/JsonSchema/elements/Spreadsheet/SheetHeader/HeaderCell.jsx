import React from 'react';
import classNames from 'classnames';
import withStyles from '@mui/styles/withStyles';
import evaluate from 'helpers/evaluate';

const MAX_ROW_WIDTH = 320;

const styles = {
  cell: {
    whiteSpace: 'normal !important',
    verticalAlign: 'middle',
    textAlign: 'center',
    wordBreak: 'break-word',
    color: 'rgb(0, 0, 0) !important',
    backgroundColor: 'transparent !important',
    lineHeight: 1.4,
    fontWeight: 500,
  },
};

const HeaderCell = ({
  classes,
  data,
  cell,
  cellKey,
  headAlign,
  staticWidth,
  task,
  pathIndex,
}) => {
  const [width, setWidth] = React.useState();
  const [ref, setRef] = React.useState();
  const [label, setLabel] = React.useState(cell.label || cell);
  const document = task?.document?.data;
  const labelIsFunc = cell?.labelIsFunc;

  React.useEffect(() => {
    if (!ref || staticWidth !== undefined) return;

    if (labelIsFunc) {
      const labelValue = evaluate(
        cell.label || cell,
        document,
        pathIndex?.index,
      );
      if (labelValue instanceof Error) {
        console.log(labelValue);
      } else {
        setLabel(labelValue);
      }
    }

    const lengths = (data || []).map(({ [cellKey]: { value } = {} }) => {
      if (Array.isArray(value)) {
        return MAX_ROW_WIDTH;
      }
      return (value || '').length * 8;
    });

    const maxCellWidth = Math.max(...lengths);

    if (maxCellWidth && !width) {
      const minCellWidth = Math.min(MAX_ROW_WIDTH, maxCellWidth);
      const newWidth = Math.max(ref.offsetWidth, minCellWidth);
      if (newWidth !== width) {
        setWidth(newWidth);
      }
    }
  }, [
    ref,
    cellKey,
    data,
    width,
    staticWidth,
    document,
    labelIsFunc,
    cell,
    pathIndex,
  ]);

  const setCellRef = React.useCallback((cellRef) => {
    setRef(cellRef);
  }, []);

  return (
    <th
      ref={setCellRef}
      key={cellKey}
      className={classNames('cell read-only', classes.cell)}
      colSpan={cell.colspan}
      rowSpan={cell.rowSpan}
      style={{
        verticalAlign: headAlign || 'middle',
        fontSize: 12, //headFontSize || 'inherit',
        textAlign: cell.headHorizontalAlign || 'center',
        padding: '4px',
        width: staticWidth !== undefined ? staticWidth : width,
      }}
    >
      {label}
    </th>
  );
};

export default withStyles(styles)(HeaderCell);
