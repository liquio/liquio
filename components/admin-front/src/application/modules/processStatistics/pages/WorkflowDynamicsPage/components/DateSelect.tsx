import React from 'react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import TextField from '@mui/material/TextField';

// This component's props (open/onChange combined with renderInput,
// disableHighlightToday) predate the installed @mui/x-date-pickers v5 API —
// same mismatch documented in components/KeyboardDatePicker/index.tsx.
const DatePickerAny = DatePicker as unknown as React.ComponentType<Record<string, unknown>>;

interface DateSelectProps {
  value?: string | Date;
  onChange: (value: string | null) => void;
  error?: string | null;
  // Passed by UntilThisMomentSelect.tsx alongside value/onChange but never
  // read here — matches the original .jsx, which also ignored it.
  period?: string;
}

const DateSelect = ({ value, onChange, error }: DateSelectProps) => {
  const [open, setOpen] = React.useState(false);

  const handleChange = (date: { format: (fmt: string) => string } | null) => {
    date !== null ? onChange(date.format('YYYY-MM-DD')) : onChange(date);
  };

  return (
    <DatePickerAny
      open={open}
      onChange={handleChange}
      maxDate={new Date()}
      value={value === 'NOW()' ? new Date() : value}
      disableHighlightToday={true}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      renderInput={(params: any) => (
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
