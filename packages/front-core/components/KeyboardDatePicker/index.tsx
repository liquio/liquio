/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/jsx-no-duplicate-props */
import React, { useState } from 'react';
import { translate } from 'react-translate';
import { IconButton } from '@mui/material';
import { Theme } from '@mui/material/styles';
import withStyles from '@mui/styles/withStyles';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import TextField from '@mui/material/TextField';
import ClearIcon from '@mui/icons-material/ClearOutlined';
import type { Moment } from 'moment';

// This component's props (open/onClose combined with renderInput, plus the
// v4-era leftArrowButtonProps/rightArrowButtonProps) predate the installed
// @mui/x-date-pickers@5 API — cast to a loose component type rather than
// fighting its real (materially different) prop surface.
const DatePickerAny = DatePicker as unknown as React.ComponentType<Record<string, unknown>>;

const styles = (theme: Theme) => ({
  label: {
    fontWeight: 400,
    fontSize: '12px',
    lineHeight: '16px',
    marginBottom: 4,
    color: theme?.palette?.text?.secondary,
  },
  inputWrap: {
    marginBottom: 24,
  },
  relative: {
    position: 'relative' as const,
  },
});

interface KeyboardDatePickerProps {
  t: (key: string) => string;
  classes: Record<string, string>;
  dateFormat?: string;
  name?: string;
  label?: string;
  onChange: (event: { name?: string; value: string }) => void;
  value?: Moment | string | null;
  minDate?: string | null;
}

const KeyboardDatePicker = ({
  t,
  classes,
  dateFormat,
  name,
  label,
  onChange,
  value,
  minDate,
}: KeyboardDatePickerProps) => {
  const [date, setDate] = useState(value);
  const [open, setOpen] = React.useState(false);

  const handleChange = (newDate: Moment | null) => {
    onChange({
      name,
      value: newDate ? newDate.format(dateFormat) : '',
    });

    setDate(newDate);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderInput = (params: any) => (
    <TextField
      {...params}
      variant="standard"
      onClick={() => setOpen(true)}
      inputProps={{
        ...params.inputProps,
        placeholder: '',
      }}
      {...(date
        ? {
            InputProps: {
              endAdornment: (
                <IconButton
                  onClick={() => {
                    setDate(null);
                    handleChange(null);
                  }}
                  size="large"
                >
                  <ClearIcon />
                </IconButton>
              ),
            },
          }
        : {})}
    />
  );

  return (
    <div className={classes.relative}>
      <DatePickerAny
        open={open}
        className={classes.inputWrap}
        onChange={handleChange}
        label={t(label as string)}
        format={dateFormat}
        value={date}
        name={name}
        inputProps={{
          tabIndex: '0',
          role: 'button',
        }}
        leftArrowButtonProps={{
          'aria-label': t('BtnPrevMonth'),
        }}
        rightArrowButtonProps={{
          'aria-label': t('BtnNextMonth'),
        }}
        renderInput={renderInput}
        onClose={() => setOpen(false)}
        minDate={minDate}
      />
    </div>
  );
};

KeyboardDatePicker.defaultProps = {
  dateFormat: 'DD MMMM YYYY',
  name: 'default',
  label: 'default',
  value: null,
  minDate: null,
};

const styled = withStyles(styles)(KeyboardDatePicker as never);
const translated = translate('DatePicker')(styled as never);
export default translated as unknown as React.ComponentType<Record<string, unknown>>;
