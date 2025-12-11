import React from 'react';
import uuid from 'uuid-random';
import { makeStyles } from '@mui/styles';
import MaterialInput from '@mui/material/Input';
import stringToNumber from 'helpers/stringToNumber';

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
    '& input': {
      '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
        '-webkit-appearance': 'none',
        margin: 0,
      },
      '&[type=number]': {
        ' -moz-appearance': 'textfield',
      },
    }
  },
}));

const NumberCell = (props) => {
  const { rowData, columnData, setRowData } = props;
  const toFixed = columnData?.toFixed;
  const [id] = React.useState(uuid());
  const classes = useStyles();

  const handleChange = React.useCallback(
    (event) => {
      const regex = new RegExp(`^(\\d+)(\\.\\d{0,${toFixed}})?$`);
      const inputValue = event.target.value;
      if (!inputValue) {
        setRowData({
          ...rowData,
          [columnData.id]: '',
        });
        return;
      }
      if (regex.test(inputValue)) {
        setRowData({
          ...rowData,
          [columnData.id]: stringToNumber(inputValue),
        });
      }

    },
    [columnData.id, rowData, setRowData],
  );
  const value = React.useMemo(
    () => rowData?.[columnData.id] || '',
    [columnData.id, rowData],
  );

  return (
    <MaterialInput
      {...props}
      value={value}
      onChange={handleChange}
      className={classes.input}
      onKeyDown={(e) => {
        if (e.key === '-') {
          e.preventDefault();
        }
      }}
      inputProps={{ ...columnData, id, min: 0 }}
    />
  );
};

const numberColumn = (options) => ({
  ...options,
  component: NumberCell,
  columnData: options,
  disableKeys: true,
  keepFocus: true,
  disabled: options.disabled,
});

export default numberColumn;
