/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/jsx-no-duplicate-props */
import React, { useState } from 'react';
import { translate } from 'react-translate';
import PropTypes from 'prop-types';
import { IconButton } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import TextField from '@mui/material/TextField';
import ClearIcon from '@mui/icons-material/ClearOutlined';

const styles = () => ({
  label: {
    fontWeight: 400,
    fontSize: '12px',
    lineHeight: '16px',
    marginBottom: 4,
    color: '#444444',
  },
  inputWrap: {
    marginBottom: 24,
  },
  relative: {
    position: 'relative',
  },
});

const KeyboardDatePicker = ({
  t,
  classes,
  dateFormat,
  name,
  label,
  onChange,
  value,
  minDate,
}) => {
  const [date, setDate] = useState(value);
  const [open, setOpen] = React.useState(false);

  const handleChange = (newDate) => {
    onChange({
      name,
      value: newDate ? newDate.format(dateFormat) : '',
    });

    setDate(newDate);
  };

  const renderInput = (params) => (
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
      <DatePicker
        open={open}
        className={classes.inputWrap}
        onChange={handleChange}
        label={t(label)}
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

KeyboardDatePicker.propTypes = {
  t: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired,
  onChange: PropTypes.object.isRequired,
  dateFormat: PropTypes.string,
  name: PropTypes.string,
  label: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.oneOf([null])]),
  minDate: PropTypes.oneOfType([PropTypes.string, PropTypes.oneOf([null])]),
};

KeyboardDatePicker.defaultProps = {
  dateFormat: 'DD MMMM YYYY',
  name: 'default',
  label: 'default',
  value: null,
  minDate: null,
};

const styled = withStyles(styles)(KeyboardDatePicker);
const translated = translate('DatePicker')(styled);
export default translated;
