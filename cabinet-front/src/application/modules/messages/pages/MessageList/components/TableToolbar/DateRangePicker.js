import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Button, Popover, Box, TextField, FormHelperText } from '@mui/material';
import { translate } from 'react-translate';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import DateRangeIcon from '@mui/icons-material/DateRange';
import MobileDetect from 'mobile-detect';

import { ReactComponent as CalendarIcon } from './../../../Message/assets/ic_calendar.svg';
import { ReactComponent as ClearIcon } from './../../../Message/assets/clear.svg';

const DateRangePicker = React.memo(
  ({ t, classes, startDate, endDate, onDateChange, handleClear }) => {
    const [anchorEl, setAnchorEl] = React.useState(null);
    const [error, setError] = React.useState([]);
    const [errorMessage, setErrorMessage] = React.useState({});
    const open = Boolean(anchorEl);
    const today = moment().format('YYYY-MM-DD');

    const [isMobile] = React.useState(() => {
      const md = new MobileDetect(window.navigator.userAgent);
      const isMobile = !!md.mobile();
      return isMobile;
    });

    const handleButtonClick = React.useCallback((event) => {
      setAnchorEl(event.currentTarget);
    }, []);

    const handlePopoverClose = React.useCallback(() => {
      setAnchorEl(null);
    }, []);

    const checkDateFormat = React.useCallback(
      (date, input) => {
        if (!date) {
          return false;
        }

        const dateFormatMatch = date.match(/\d{2}\.\d{2}\.\d{4}/);

        const dateIsValid = moment(date, 'DD.MM.YYYY', true).isValid();

        if (dateIsValid && dateFormatMatch) {
          const parsedDate = moment(date, 'DD.MM.YYYY');
          if (parsedDate.isAfter(today)) {
            setError((prevError) => prevError.concat(input));
            setErrorMessage((prevErrorMessage) => ({
              ...prevErrorMessage,
              [input]: t('ErrorDateToday')
            }));
            return false;
          }
          return true;
        }

        if (dateFormatMatch && !dateIsValid) {
          setError(error.concat(input));
          return false;
        }

        return false;
      },
      [error, today, t]
    );

    const handleStartDateChange = React.useCallback(
      (date, context) => {
        const formattedDate = moment(date).isAfter(today) ? today : date;
        if (context || !formattedDate) {
          checkDateFormat(context, 'start') && onDateChange({ startDate: formattedDate, endDate });
          return;
        }

        onDateChange({ startDate: formattedDate, endDate });
      },
      [endDate, onDateChange, checkDateFormat, today]
    );

    const handleEndDateChange = React.useCallback(
      (date, context) => {
        const formattedDate = moment(date).isAfter(today) ? today : date;
        if (context || !formattedDate) {
          checkDateFormat(context, 'end') && onDateChange({ startDate, endDate: formattedDate });
          return;
        }

        onDateChange({ startDate, endDate: formattedDate });
      },
      [startDate, onDateChange, checkDateFormat, today]
    );

    const handleClearFilter = React.useCallback(() => {
      handleClear();
      handlePopoverClose();
    }, [handleClear, handlePopoverClose]);

    const outputDateRange = React.useCallback(() => {
      const formatDate = (date) => moment(date, 'YYYY-MM-DD').format('DD.MM.YYYY');

      if (startDate && endDate) {
        return `${formatDate(startDate)} - ${formatDate(endDate)}`;
      }

      if (startDate) {
        return `${formatDate(startDate)} - ${t('To')}`;
      }

      if (endDate) {
        return `${t('From')} - ${formatDate(endDate)}`;
      }

      return !isMobile ? t('ByDate') : null;
    }, [startDate, endDate, t]);

    const renderInput = React.useCallback(
      (params, input) => (
        <div>
          <TextField
            {...params}
            variant="standard"
            inputProps={{
              ...params.inputProps,
              placeholder: t('DateFormatPlaceholder')
            }}
            error={error.includes(input)}
          />
          {error.includes(input) && <FormHelperText error>{errorMessage[input]}</FormHelperText>}
        </div>
      ),
      [t, error, errorMessage]
    );

    return (
      <>
        <Button
          onClick={handleButtonClick}
          startIcon={isMobile ? <DateRangeIcon /> : null}
          endIcon={!isMobile ? <ArrowDropDownIcon /> : null}
          className={isMobile ? classes.mobileBtn : null}
        >
          {outputDateRange()}
        </Button>
        <Popover
          open={open}
          anchorEl={anchorEl}
          onClose={handlePopoverClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left'
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left'
          }}
          classes={{ paper: classes.paper }}
        >
          <Box>
            <LocalizationProvider dateAdapter={AdapterMoment} adapterLocale={moment.locale()}>
              <DatePicker
                value={startDate}
                onChange={handleStartDateChange}
                renderInput={(params) => renderInput({ ...params, autoFocus: true }, 'start')}
                components={{ OpenPickerIcon: CalendarIcon }}
                label={t('From')}
                className={classes.filterItem}
                maxDate={endDate || today}
              />

              <DatePicker
                value={endDate}
                onChange={handleEndDateChange}
                renderInput={(params) => renderInput({ ...params }, 'end')}
                components={{ OpenPickerIcon: CalendarIcon }}
                label={t('To')}
                className={classes.filterItem}
                minDate={startDate}
                maxDate={today}
              />
            </LocalizationProvider>

            <Button
              onClick={handleClearFilter}
              startIcon={<ClearIcon />}
              classes={{
                root: classes.clearButton
              }}
            >
              {t('ClearFilter')}
            </Button>
          </Box>
        </Popover>
      </>
    );
  }
);

DateRangePicker.propTypes = {
  t: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired,
  startDate: PropTypes.string,
  endDate: PropTypes.string,
  onDateChange: PropTypes.func.isRequired,
  handleClear: PropTypes.func.isRequired
};

DateRangePicker.defaultProps = {
  startDate: '',
  endDate: ''
};

export default translate('MessageListPage')(DateRangePicker);
