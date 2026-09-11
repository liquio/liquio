import { generateUUID } from 'utils/uuid';
import React from 'react';
import MobileDetect from 'mobile-detect';
import { makeStyles } from '@mui/styles';
import MaterialInput from '@mui/material/Input';

const useStyles = makeStyles(() => ({
  input: {
    fontFamily: 'Roboto Mono, sans-serif',
    fontSize: '1rem',
    paddingLeft: 10,
    paddingRight: 10,
    width: '100%',
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
}));

interface ColumnData {
  id: string;
  useTrim?: boolean;
  setActiveCellRef?: (ref: Record<string, React.RefObject<HTMLInputElement | null>>) => void;
  disabled?: boolean;
  [key: string]: unknown;
}

interface TextCellProps {
  rowData: Record<string, unknown>;
  columnData: ColumnData;
  setRowData: (rowData: Record<string, unknown>) => void;
  focus: boolean;
  columnIndex: number;
  rowIndex: number;
  [key: string]: unknown;
}

const TextCell = (props: TextCellProps) => {
  const { rowData, columnData, setRowData, focus } = props;
  const ref = React.useRef<HTMLInputElement>(null);
  const [id] = React.useState(generateUUID());
  const classes = useStyles();
  const [isMobile] = React.useState(() => {
    const md = new MobileDetect(window.navigator.userAgent);
    const isMobile = !!md.mobile();
    return isMobile;
  });

  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setRowData({
        ...rowData,
        [columnData.id]: event.target.value,
      });
    },
    [columnData.id, rowData, setRowData],
  );

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      const target = event.target as HTMLInputElement;
      if (
        isMobile &&
        event.key.toLowerCase() === 'backspace' &&
        target.value
      ) {
        event.preventDefault();
        event.stopPropagation();
        target.value = target.value.slice(0, -1);
        handleChange(event as unknown as React.ChangeEvent<HTMLInputElement>);
      }
    },
    [isMobile, handleChange],
  );

  const handleTrim = React.useCallback(
    (event: React.FocusEvent<HTMLInputElement>) => {
      if (columnData?.useTrim) {
        handleChange({
          target: {
            value: event.target.value?.trim(),
          },
        } as React.ChangeEvent<HTMLInputElement>);
      }
    },
    [columnData.useTrim, handleChange],
  );

  const value = React.useMemo(
    () => rowData[columnData.id] || '',
    [columnData.id, rowData],
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

  return (
    <MaterialInput
      {...(props as unknown as Record<string, unknown>)}
      inputRef={ref}
      value={value}
      onKeyDown={handleKeyDown}
      onChange={handleChange}
      onBlur={handleTrim}
      className={classes.input}
      inputProps={{ ...columnData, id }}
    />
  );
};

const textColumn = (options: ColumnData) => ({
  ...options,
  component: TextCell,
  columnData: options,
  disableKeys: true,
  keepFocus: true,
  disabled: options.disabled,
});

export default textColumn;
