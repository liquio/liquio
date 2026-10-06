import React from 'react';
import { translate } from 'react-translate';
import type { Translate } from 'react-translate';
import { IconButton, Button } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import type { WithStyles } from '@mui/styles/withStyles';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import TextField from '@mui/material/TextField';
import type { TextFieldProps } from '@mui/material/TextField';
import ClearIcon from '@mui/icons-material/ClearOutlined';
import type { Dayjs } from 'dayjs';

const styles = () => ({
  label: {
    fontWeight: 400,
    fontSize: '12px',
    lineHeight: '16px',
    marginBottom: 4,
    opacity: 0.5,
  },
  inputWrap: {
    marginBottom: 24,
  },
  relative: {
    position: 'relative' as const,
  },
});

interface KeyboardDatePickerProps extends WithStyles<typeof styles> {
  t: Translate;
  dateFormat?: string;
  name?: string;
  label?: string;
  /** Called with the formatted date, or `''` when cleared. (The old PropTypes said `object`.) */
  onChange: (value: string) => void;
  value?: Dayjs | string | null;
  minDate?: Dayjs | string | null;
  maxDate?: Dayjs | string | null;
  setId: (elementName: string) => string;
  handleNextStep: () => void;
}

const KeyboardDatePicker = ({
  t,
  classes,
  dateFormat = 'DD/MM/YYYY',
  name = 'default',
  label = 'default',
  onChange,
  value = null,
  minDate = null,
  maxDate,
  setId,
  handleNextStep,
}: KeyboardDatePickerProps) => {
  // This component's props (open/onClose combined with renderInput, plus the v4-era
  // leftArrowButtonProps/rightArrowButtonProps) predate the installed @mui/x-date-pickers@5 API. Cast to a
  // loose component type rather than fighting its real prop surface (same precedent as front-core). Kept
  // inside the component, not at module level, so it can never be read before initialisation.
  const DatePickerAny = DatePicker as unknown as React.ComponentType<Record<string, unknown>>;

  const [date, setDate] = React.useState<Dayjs | string | null>(value || null);
  const [open, setOpen] = React.useState(false);

  const handleChange = (newDate: Dayjs | null) => {
    onChange(newDate ? newDate.format(dateFormat) : '');
    setDate(newDate);
  };

  const renderInput = (params: TextFieldProps) => (
    <TextField
      {...params}
      variant="standard"
      onClick={() => setOpen(true)}
      inputProps={{
        ...params.inputProps,
        autocomplete: 'off',
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
                  aria-label={t('Clear')}
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
        id={setId('date-picker')}
        open={open}
        className={classes.inputWrap}
        onChange={handleChange}
        label={label}
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
        maxDate={maxDate}
      />
      {date && date !== 'Invalid Date' ? (
        // The old `setId` prop on this Button is gone: MUI never reads it and React drops function-valued
        // unknown props from the DOM, so it only produced a dev-mode warning.
        <Button variant="contained" onClick={handleNextStep} aria-label={t('ACCEPT')}>
          {t('ACCEPT')}
        </Button>
      ) : null}
    </div>
  );
};

const styled = withStyles(styles)(KeyboardDatePicker);
const translated = translate('DatePicker')(styled);
export default translated;
