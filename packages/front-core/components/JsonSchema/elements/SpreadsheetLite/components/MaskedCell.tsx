import { generateUUID } from 'utils/uuid';
import React from 'react';
import MobileDetect from 'mobile-detect';
import InputMask from 'react-input-mask';
import { makeStyles } from '@mui/styles';
import MaterialInput from '@mui/material/Input';

const useStyles = makeStyles(() => ({
  input: {
    fontFamily: 'Roboto Mono, sans-serif',
    fontSize: '1rem',
    paddingLeft: 10,
    paddingRight: 10,
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

const ForwardedMaterialInput = React.forwardRef<HTMLInputElement, Record<string, unknown>>((props, ref) => (
  <MaterialInput {...props} inputRef={ref} />
));

interface ColumnData {
  id: string;
  mask?: string;
  setActiveCellRef?: (ref: Record<string, React.RefObject<HTMLInputElement | null>>) => void;
  disabled?: boolean;
  [key: string]: unknown;
}

interface MaskedCellProps {
  rowData: Record<string, unknown>;
  columnData: ColumnData;
  setRowData: (rowData: Record<string, unknown>) => void;
  focus: boolean;
  columnIndex: number;
  rowIndex: number;
  [key: string]: unknown;
}

const MaskedCell = (props: MaskedCellProps) => {
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
    <InputMask
      id={id}
      mask={columnData?.mask}
      value={value as string}
      maskChar={null}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
    >
      {(inputProps: Record<string, unknown>) => (
        <ForwardedMaterialInput
          {...inputProps}
          ref={ref}
          className={classes.input}
        />
      )}
    </InputMask>
  );
};

const maskColumn = (options: ColumnData) => ({
  ...options,
  component: MaskedCell,
  columnData: options,
  disableKeys: true,
  keepFocus: true,
  disabled: options.disabled,
});

export default maskColumn;
