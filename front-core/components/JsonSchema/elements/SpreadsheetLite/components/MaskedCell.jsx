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

const ForwardedMaterialInput = React.forwardRef((props, ref) => (
  <MaterialInput {...props} inputRef={ref} />
));

const MaskedCell = (props) => {
  const { rowData, columnData, setRowData, focus } = props;
  const ref = React.useRef(null);
  const [id] = React.useState(crypto.randomUUID());
  const classes = useStyles();
  const [isMobile] = React.useState(() => {
    const md = new MobileDetect(window.navigator.userAgent);
    const isMobile = !!md.mobile();
    return isMobile;
  });

  const handleChange = React.useCallback(
    (event) => {
      setRowData({
        ...rowData,
        [columnData.id]: event.target.value,
      });
    },
    [columnData.id, rowData, setRowData],
  );

  const handleKeyDown = React.useCallback(
    (event) => {
      if (
        isMobile &&
        event.key.toLowerCase() === 'backspace' &&
        event.target.value
      ) {
        event.preventDefault();
        event.stopPropagation();
        event.target.value = event.target.value.slice(0, -1);
        handleChange(event);
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
      ref.current.focus();
    } else {
      ref.current.blur();
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
      value={value}
      maskChar={null}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
    >
      {(inputProps) => (
        <ForwardedMaterialInput
          {...inputProps}
          ref={ref}
          className={classes.input}
        />
      )}
    </InputMask>
  );
};

const maskColumn = (options) => ({
  ...options,
  component: MaskedCell,
  columnData: options,
  disableKeys: true,
  keepFocus: true,
  disabled: options.disabled,
});

export default maskColumn;
