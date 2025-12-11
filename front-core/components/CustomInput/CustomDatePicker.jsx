import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { IconButton, TextField } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker';
import { translate } from 'react-translate';
import ClearIcon from '@mui/icons-material/Clear';
import EventIcon from '@mui/icons-material/Event';
import moment from 'moment';

import setComponentsId from 'helpers/setComponentsId';
import { today, filterFormat } from 'helpers/humanDateFormat';

const defaultFormat = 'DD.MM.YYYY';
const defaultMinDate = moment('01.01.1900', defaultFormat);

const styles = (theme) => ({
  dateContainer: {
    marginTop: 0,
    '& > label': {
      fontSize: 16,
      lineHeight: '18px',
      [theme.breakpoints.down('md')]: {
        fontSize: 13
      }
    }
  },
  deleteIconBtn: {
    width: 30,
    height: 30
  },
  dateContainerWrapperDark: {
    width: '100%'
  },
  darkThemeRoot: {
    padding: 17,
    ...theme.listBackground
  },
  dateContainerDark: {
    margin: 0
  },
  darkThemeLabel: {
    width: '100%',
    background: theme?.header?.background,
    borderRadius: '4px 4px 0px 0px',
    '& fieldset': {
      borderRadius: '4px 4px 0px 0px',
      borderColor: 'transparent',
      '& span': {
        display: 'none'
      }
    }
  },
  underlineThemeLabel: {
    paddingLeft: 7
  },
  errorIcon: {
    '& svg': {
      fill: '#f44336'
    }
  },
  labelText: {
    '& .MuiFormLabel-root': {
      paddingRight: 34
    }
  }
});

class CustomDatePicker extends Component {
  constructor(props) {
    super(props);

    const { date, incomingFormat, error, minDate, maxDate } = props;

    this.state = {
      date: date ? moment(date, incomingFormat) : today(),
      dateText: date ? this.getIncomingDate(date) : '',
      error: error || '',
      minDate: minDate ? this.getIncomingDate(minDate) : defaultMinDate.format(defaultFormat),
      maxDate: maxDate ? this.getIncomingDate(maxDate) : null,
      open: false,
      opening: false
    };
  }

  getIncomingDate = (date) => {
    const { incomingFormat } = this.props;
    return moment(date, incomingFormat).format(defaultFormat);
  };

  onChange = (date) => {
    const { onChange, incomingFormat } = this.props;
    const dateText = date ? date.format(defaultFormat) : '';
    const dateTextFormatted = date ? date.format(incomingFormat) : '';

    this.setState(
      {
        date,
        dateText
      },
      () => onChange(dateTextFormatted)
    );
  };

  handleDelete = () => {
    const { onChange } = this.props;

    this.setState(
      {
        dateText: '',
        error: ''
      },
      () => {
        onChange('');
      }
    );
  };

  validateDate = (value, update) => {
    const { t, onChange, required } = this.props;
    const { minDate, maxDate } = this.state;
    const isValid = moment(value, defaultFormat, true).isValid();

    let error = '';

    if ((required && !isValid) || (!required && value && !isValid)) {
      error = t('FormatError');
    } else if (isValid) {
      if (moment(value, defaultFormat).toDate() < moment(minDate, defaultFormat).toDate()) {
        error = t('MinDateError', { date: minDate });
      } else if (moment(value, defaultFormat).toDate() > moment(maxDate, defaultFormat).toDate()) {
        error = t('MaxDateError', { date: maxDate });
      } else if (update) {
        this.onChange(moment(value, defaultFormat));
      }
    }

    if (!value.length && update) {
      onChange(value);
    }

    this.setState({
      dateText: value,
      error
    });
  };

  onInputChange = ({ target: { value } }) => this.validateDate(value, true);

  componentWillReceiveProps = (nextProps) => {
    const { date, minDate, maxDate, error, helperText, incomingFormat } = nextProps;

    this.setState({
      date: moment(date || new Date(), incomingFormat),
      minDate: minDate ? this.getIncomingDate(minDate) : defaultMinDate.format(defaultFormat),
      maxDate: maxDate ? this.getIncomingDate(maxDate) : null
    });

    if (date.length > 0) {
      this.validateDate(this.getIncomingDate(date));
    } else if (error) {
      this.setState({ error: typeof error === 'string' ? error : helperText });
    } else {
      this.setState({ dateText: '' });
    }
  };

  checkLabelDate = () => {
    const { t } = this.props;
    const { date } = this.state;

    if (moment(date).format(defaultFormat) === moment().format(defaultFormat)) {
      return t('ChooseLabelData');
    }

    return t('LabelData', {
      date: moment(date).format(defaultFormat)
    });
  };

  handleClosePicker = () => this.setState({ open: false, opening: false });

  disableDate = (day) => {
    const { allowedDays, disabledDays } = this.props;
    if (allowedDays && (allowedDays || []).length) {
      return !allowedDays.includes(day.format('DD.MM.YYYY'));
    }
    if (disabledDays && (disabledDays || []).length) {
      return disabledDays.includes(day.format('DD.MM.YYYY'));
    }
  };

  handleOpenPicker = () => {
    this.setState({ open: true }, () => this.onOpen());
  };

  onOpen = () => {
    const { minDate } = this.state;

    if (minDate) {
      setTimeout(() => {
        this.setState({ opening: true });
      }, 100);
    }
  };

  getPickerValue = () => {
    const { value } = this.props;
    const { date, opening } = this.state;

    if (opening) {
      return null;
    }

    if (value) {
      return date;
    }

    return null;
  };

  renderInput = (params) => {
    const { classes, darkTheme, t, helperText } = this.props;
    const { dateText, error } = this.state;
    return (
      <TextField
        {...params}
        variant={darkTheme ? 'outlined' : 'standard'}
        classes={{
          root: classNames({
            [classes.focuses]: darkTheme,
            [classes.labelText]: true
          })
        }}
        inputProps={{
          ...params.inputProps,
          placeholder: t('Mask')
        }}
        error={!!error}
        helperText={typeof error === 'string' && !!error ? error : helperText}
        InputProps={{
          endAdornment:
            dateText && dateText.length ? (
              <IconButton
                onClick={this.handleDelete}
                className={classNames({
                  [classes.deleteIconBtn]: true
                })}
                aria-label={t('ClearInputBtn')}
                tabIndex="0"
                size="large"
              >
                <ClearIcon />
              </IconButton>
            ) : (
              <IconButton
                onClick={this.handleOpenPicker}
                className={classNames({
                  [classes.deleteIconBtn]: true
                })}
                tabIndex="0"
                size="large"
                aria-label={t('ChooseLabelData')}
              >
                <EventIcon />
              </IconButton>
            )
        }}
      />
    );
  };

  render = () => {
    const {
      t,
      classes,
      label,
      id,
      helperText,
      margin,
      fullWidth,
      darkTheme,
      disableToolbar,
      setId,
      error: errorProps
    } = this.props;

    const { dateText, error, minDate, maxDate, open } = this.state;

    const pickerId = setId ? setId(`date-picker ${id}`) : setComponentsId('date-picker')(` ${id} `);

    const dateLimits = {};

    if (minDate) {
      dateLimits.minDate = moment(minDate, defaultFormat);
    }

    if (maxDate) {
      dateLimits.maxDate = moment(maxDate, defaultFormat);
    }

    return (
      <div
        className={classNames({
          [classes.dateContainerWrapperDark]: darkTheme
        })}
      >
        <DesktopDatePicker
          {...dateLimits}
          open={open}
          className={classNames({
            [classes.dateContainer]: true,
            [classes.darkThemeLabel]: darkTheme,
            [classes.dateContainerDark]: darkTheme,
            [classes.errorIcon]: !!errorProps
          })}
          fullWidth={fullWidth}
          label={label || t('Label')}
          margin={margin}
          format={defaultFormat}
          cancelLabel={t('Cancel')}
          helperText={typeof error === 'string' && !!error ? error : helperText}
          onChange={this.onChange}
          value={this.getPickerValue()}
          onOpen={this.onOpen}
          error={!!error}
          keyboard={true}
          autoOk={true}
          disableToolbar={disableToolbar}
          id={pickerId}
          inputFormat={defaultFormat}
          InputProps={{
            value: dateText,
            onChange: this.onInputChange,
            classes: {
              underline: classNames({
                [classes.underlineThemeLabel]: darkTheme
              })
            }
          }}
          inputProps={{
            tabIndex: '0',
            role: 'textbox',
            'aria-label': this.checkLabelDate()
          }}
          leftArrowButtonProps={{
            'aria-label': t('BtnPrevMonth')
          }}
          rightArrowButtonProps={{
            'aria-label': t('BtnNextMonth')
          }}
          disableHighlightToday={true}
          renderInput={this.renderInput}
          onClose={this.handleClosePicker}
          shouldDisableDate={this.disableDate}
        />
      </div>
    );
  };
}

CustomDatePicker.propTypes = {
  setId: PropTypes.func,
  t: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  date: PropTypes.oneOfType([PropTypes.instanceOf(Date), PropTypes.string]),
  incomingFormat: PropTypes.string,
  id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  label: PropTypes.string,
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  helperText: PropTypes.string,
  minDate: PropTypes.oneOfType([PropTypes.instanceOf(Date), PropTypes.string, PropTypes.object]),
  maxDate: PropTypes.oneOfType([PropTypes.instanceOf(Date), PropTypes.string, PropTypes.object]),
  margin: PropTypes.string,
  required: PropTypes.bool,
  fullWidth: PropTypes.bool,
  darkTheme: PropTypes.bool,
  disableToolbar: PropTypes.bool
};

CustomDatePicker.defaultProps = {
  setId: undefined,
  date: '',
  incomingFormat: filterFormat,
  id: '',
  label: '',
  error: '',
  helperText: '',
  minDate: '',
  maxDate: '',
  margin: 'normal',
  required: true,
  fullWidth: true,
  darkTheme: false,
  disableToolbar: false
};

const styled = withStyles(styles)(CustomDatePicker);

export default translate('DatePicker')(styled);
