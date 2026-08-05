import React from 'react';
import { makeStyles } from '@mui/styles';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';

const useStyles = makeStyles(() => ({
  select: {
    width: '100%',
    backgroundColor: '#f1f1f1',
    padding: 5,
    borderRadius: 16,
    margin: '0 5px',
    fontFamily: 'Roboto Mono, sans-serif',
    fontSize: '1rem',
    paddingLeft: '15px',
    paddingRight: '15px',
    '&.MuiSelect-select': {
      height: 18,
      lineHeight: '21px',
    },
    '&.MuiSelect-select:focus': {
      backgroundColor: '#f1f1f1',
      borderRadius: 16,
    },
  },
  menuItem: {
    fontFamily: 'Roboto Mono, sans-serif',
    fontSize: '1rem',
    whiteSpace: 'normal',
  },
  formControl: {
    width: '100%',
    '& fieldset': {
      border: 'none',
    },
  },
  menu: {
    maxWidth: '400px',
  },
  paper: {
    boxShadow:
      '0px 1px 2px 0px rgba(0, 0, 0, 0.30), 0px 2px 6px 2px rgba(0, 0, 0, 0.15)',
  },
}));

const SelectComponent = React.memo((props) => {
  const { rowData, columnData, stopEditing, setRowData } = props;
  const classes = useStyles();
  const ref = React.useRef(null);

  const handleChange = React.useCallback(
    (event) => {
      setRowData({
        ...rowData,
        [columnData.id]: event.target.value,
      });
      setTimeout(stopEditing, 0);
    },
    [columnData.id, rowData, setRowData, stopEditing],
  );

  const value = React.useMemo(
    () => rowData[columnData.id] || '',
    [columnData.id, rowData],
  );

  return (
    <FormControl className={classes.formControl}>
      <Select
        ref={ref}
        value={value}
        isDisabled={columnData.disabled}
        onChange={handleChange}
        classes={{ select: classes.select }}
        MenuProps={{
          classes: { root: classes.menu, paper: classes.paper },
        }}
      >
        <MenuItem value={''}>-</MenuItem>
        {columnData.options.map(({ name, id }) => (
          <MenuItem key={id} value={id} classes={{ root: classes.menuItem }}>
            {name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
});

const selectColumn = (options) => ({
  ...options,
  component: SelectComponent,
  columnData: options,
  disableKeys: true,
  keepFocus: true,
  disabled: options.disabled,
});

export default selectColumn;
