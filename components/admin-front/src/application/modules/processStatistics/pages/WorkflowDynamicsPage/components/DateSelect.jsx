import React from 'react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import TextField from '@mui/material/TextField';

const DateSelect = ({ value, onChange, error }) => {
  const [open, setOpen] = React.useState(false);

  const handleChange = (date) => {
    date !== null ? onChange(date.format('YYYY-MM-DD')) : onChange(date);
  };

  return (
    <DatePicker
      open={open}
      onChange={handleChange}
      maxDate={new Date()}
      value={value === 'NOW()' ? new Date() : value}
      disableHighlightToday={true}
      renderInput={(params) => (
        <TextField
          variant="outlined"
          error
          helperText={error}
          {...params}
          onClick={() => setOpen(true)}
        />
      )}
      onClose={() => setOpen(false)}
    />
  );
};

export default DateSelect;
