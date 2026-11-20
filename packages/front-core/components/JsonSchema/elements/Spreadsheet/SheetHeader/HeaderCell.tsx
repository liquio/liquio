import React from 'react';
import classNames from 'classnames';
import withStyles, { WithStyles } from '@mui/styles/withStyles';
import evaluate from 'helpers/evaluate';

const MAX_ROW_WIDTH = 320;

const styles = {
  cell: {
    whiteSpace: 'normal !important',
    verticalAlign: 'middle' as const,
    textAlign: 'center' as const,
    wordBreak: 'break-word' as const,
    color: 'rgb(0, 0, 0) !important',
    backgroundColor: 'transparent !important',
    lineHeight: 1.4,
    fontWeight: 500,
  },
};

interface HeaderCellData {
  label?: React.ReactNode | string;
  colspan?: number;
  rowSpan?: number;
  headHorizontalAlign?: string;
  labelIsFunc?: boolean;
}

interface HeaderCellProps extends WithStyles<typeof styles> {
  data?: Array<Record<string, { value?: unknown }>>;
  cell: HeaderCellData | string;
  cellKey?: number;
  headAlign?: string;
  staticWidth?: number;
  headFontSize?: number;
  task?: { document?: { data: Record<string, unknown> } };
  pathIndex?: { index: number };
}

const HeaderCell = ({
  classes,
  data,
  cell,
  cellKey,
  headAlign,
  staticWidth,
  task,
  pathIndex,
}: HeaderCellProps) => {
  const [width, setWidth] = React.useState<number>();
  const [ref, setRef] = React.useState<HTMLTableCellElement>();
  const cellData = cell as HeaderCellData;
  const [label, setLabel] = React.useState<React.ReactNode>(cellData.label || (cell as React.ReactNode));
  const document = task?.document?.data;
  const labelIsFunc = cellData?.labelIsFunc;

  React.useEffect(() => {
    if (!ref || staticWidth !== undefined) return;

    if (labelIsFunc) {
      const labelValue = evaluate(
        (cellData.label || cell) as string,
        document,
        pathIndex?.index,
      );
      if (labelValue instanceof Error) {
        console.log(labelValue);
      } else {
        setLabel(labelValue as React.ReactNode);
      }
    }

    const lengths = (data || []).map((row) => {
      const value = (row?.[cellKey as unknown as string] || {}).value;
      if (Array.isArray(value)) {
        return MAX_ROW_WIDTH;
      }
      return ((value as string) || '').length * 8;
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

  const setCellRef = React.useCallback((cellRef: HTMLTableCellElement) => {
    setRef(cellRef);
  }, []);

  return (
    <th
      ref={setCellRef}
      key={cellKey}
      className={classNames('cell read-only', classes.cell)}
      colSpan={cellData.colspan}
      rowSpan={cellData.rowSpan}
      style={{
        verticalAlign: headAlign || 'middle',
        fontSize: 12,
        textAlign: (cellData.headHorizontalAlign as never) || 'center',
        padding: '4px',
        width: staticWidth !== undefined ? staticWidth : width,
      }}
    >
      {label}
    </th>
  );
};

export default withStyles(styles)(HeaderCell);
