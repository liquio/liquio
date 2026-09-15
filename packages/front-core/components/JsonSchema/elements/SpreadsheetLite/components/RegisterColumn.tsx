import React from 'react';
import { makeStyles } from '@mui/styles';
import Register from 'components/JsonSchema/elements/Register';

const useStyles = makeStyles(() => ({
  wrapper: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    '& .MuiFormControl-root': {
      width: '100%',
      margin: 0,
      paddingLeft: 5,
      paddingRight: 5
    },
    '& .MuiInput-root:before': {
      display: 'none',
    },
    '& .MuiInput-root:after': {
      display: 'none',
    },
    '& .MuiAutocomplete-root': {
      paddingLeft: 15,
      paddingRight: 15,
      fontFamily: 'Roboto Mono, sans-serif',
      fontSize: '1rem',
      width: '100%',
      backgroundColor: '#f1f1f1',
      borderRadius: 16,
      // `padding: 5` was declared twice in the original object literal (once
      // here, once as `padding: 0` below) — only the second ever took effect
      // per JS object-literal semantics; kept as the sole declaration.
      padding: 0,
      '&:before': {
        borderBottom: 'none',
      },
      '&:after': {
        borderBottom: 'none',
      },
      '&.MuiInput-root:hover': {
        '&:before': {
          borderBottom: 'none',
        },
      },
    },
  }
}));

interface PropsOrigin {
  path?: Array<string | number>;
  taskId?: string;
  stepName?: string;
  actions?: Record<string, unknown>;
  originDocument?: unknown;
}

interface ColumnData {
  id: string;
  propertyName: string;
  propsOrigin: PropsOrigin;
  setActiveCellRef?: (ref: Record<string, React.RefObject<HTMLDivElement | null>>) => void;
  disabled?: boolean;
  [key: string]: unknown;
}

interface RegisterColumnProps {
  rowData: Record<string, unknown>;
  columnData: ColumnData;
  setRowData: (rowData: Record<string, unknown>) => void;
  focus: boolean;
  columnIndex: number;
  rowIndex: number;
}

const RegisterCell = (props: RegisterColumnProps) => {
  const { rowData, columnData, columnData: { propsOrigin }, setRowData, focus } = props;
  const ref = React.useRef<HTMLDivElement>(null);
  const classes = useStyles();

  const handleChange = React.useCallback(
    (event: { data: unknown }) => {
      setRowData({
        ...rowData,
        [columnData.propertyName]: event.data
      });
    },
    [columnData.id, rowData, setRowData],
  );

  const value = React.useMemo(
    () => rowData[columnData.propertyName] || {},
    [columnData.propertyName, rowData],
  );

  React.useEffect(() => {
    if (focus) {
      ref.current?.focus();
    } else {
      ref.current?.blur();
    }
  }, [focus]);

  React.useEffect(() => {
    columnData.setActiveCellRef &&
      columnData.setActiveCellRef({
        [`${props.columnIndex}${props.rowIndex}`]: ref,
      });
  }, [columnData, props.columnIndex, props.rowIndex]);

  const path = React.useMemo(
    () => (propsOrigin.path || []).concat(props.rowIndex).concat(columnData.propertyName),
    [columnData, props.rowIndex],
  );

  return (
    <div ref={ref} className={classes.wrapper}>
      <Register
        {...columnData}
        description={''}
        taskId={propsOrigin?.taskId}
        path={path}
        stepName={propsOrigin.stepName}
        actions={propsOrigin.actions}
        originDocument={propsOrigin.originDocument}
        rootDocument={propsOrigin.originDocument}
        onChange={handleChange}
        value={value}
        defaultIcon={true}
      />
    </div>
  );
};

const registerColumn = (options: ColumnData) => ({
  ...options,
  component: RegisterCell,
  columnData: options,
  disableKeys: true,
  keepFocus: true,
  disabled: options.disabled,
});

export default registerColumn;
