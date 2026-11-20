import React, { Component } from 'react';
import classNames from 'classnames';
import { IconButton, TextField } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { DesktopDatePicker as DesktopDatePickerRaw } from '@mui/x-date-pickers/DesktopDatePicker';
import { Theme } from '@mui/material/styles';
import { translate } from 'react-translate';
import ClearIcon from '@mui/icons-material/Clear';
import EventIcon from '@mui/icons-material/Event';
import moment, { Moment } from 'moment';

import setComponentsId from 'helpers/setComponentsId';
import { today, filterFormat } from 'helpers/humanDateFormat';

// This file uses the legacy `@material-ui/pickers`-era prop surface
// (keyboard, autoOk, cancelLabel, disableToolbar, leftArrowButtonProps,
// rightArrowButtonProps, shouldDisableDate) which no longer exists on
// the installed @mui/x-date-pickers' DesktopDatePicker — a real
// version/API mismatch, not a conversion artifact.
const DesktopDatePicker = DesktopDatePickerRaw as unknown as React.ComponentType<Record<string, unknown>>;

const defaultFormat = 'DD.MM.YYYY';
const defaultMinDate = moment('01.01.1900', defaultFormat);

type AppTheme = Theme & { listBackground?: Record<string, unknown>; header?: { background?: string } };

const styles = (theme: AppTheme) => ({
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

interface CustomDatePickerProps {
  classes: Record<string, string>;
  setId?: (elementName: string) => string;
  t: (key: string, params?: Record<string, unknown>) => string;
  onChange: (value: string | Moment) => void;
  date?: Date | string;
  incomingFormat?: string;
  id?: number | string;
  label?: string;
  error?: string | boolean;
  helperText?: string;
  minDate?: Date | string | Record<string, unknown>;
  maxDate?: Date | string | Record<string, unknown>;
  margin?: string;
  required?: boolean;
  fullWidth?: boolean;
  darkTheme?: boolean;
  disableToolbar?: boolean;
  value?: unknown;
  allowedDays?: string[];
  disabledDays?: string[];
}

interface CustomDatePickerState {
  date: Moment;
  dateText: string;
  error: string;
  minDate: string;
  maxDate: string | null;
  open: boolean;
  opening: boolean;
}

class CustomDatePicker extends Component<CustomDatePickerProps, CustomDatePickerState> {
  static defaultProps: Partial<CustomDatePickerProps> = {
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

  constructor(props: CustomDatePickerProps) {
    super(props);

    const { date, incomingFormat, error, minDate, maxDate } = props;

    this.state = {
      date: date ? moment(date, incomingFormat) : today(),
      dateText: date ? this.getIncomingDate(date) : '',
      error: (error as string) || '',
      minDate: minDate ? this.getIncomingDate(minDate) : defaultMinDate.format(defaultFormat),
      maxDate: maxDate ? this.getIncomingDate(maxDate) : null,
      open: false,
      opening: false
    };
  }

  getIncomingDate = (date: Date | string | Record<string, unknown>) => {
    const { incomingFormat } = this.props;
    return moment(date as string, incomingFormat).format(defaultFormat);
  };

  onChange = (date: Moment | null) => {
    const { onChange, incomingFormat } = this.props;
    const dateText = date ? date.format(defaultFormat) : '';
    const dateTextFormatted = date ? date.format(incomingFormat) : '';

    this.setState(
      {
        date: date as Moment,
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

  validateDate = (value: string, update?: boolean) => {
    const { t, onChange, required } = this.props;
    const { minDate, maxDate } = this.state;
    const isValid = moment(value, defaultFormat, true).isValid();

    let error = '';

    if ((required && !isValid) || (!required && value && !isValid)) {
      error = t('FormatError');
    } else if (isValid) {
      if (moment(value, defaultFormat).toDate() < moment(minDate, defaultFormat).toDate()) {
        error = t('MinDateError', { date: minDate });
      } else if (moment(value, defaultFormat).toDate() > moment(maxDate as string, defaultFormat).toDate()) {
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

  onInputChange = ({ target: { value } }: { target: { value: string } }) => this.validateDate(value, true);

  componentWillReceiveProps = (nextProps: CustomDatePickerProps) => {
    const { date, minDate, maxDate, error, helperText, incomingFormat } = nextProps;

    this.setState({
      date: moment(date || new Date(), incomingFormat),
      minDate: minDate ? this.getIncomingDate(minDate) : defaultMinDate.format(defaultFormat),
      maxDate: maxDate ? this.getIncomingDate(maxDate) : null
    });

    if ((date as string).length > 0) {
      this.validateDate(this.getIncomingDate(date as string));
    } else if (error) {
      this.setState({ error: (typeof error === 'string' ? error : helperText) as string });
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

  disableDate = (day: Moment) => {
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

  renderInput = (params: Record<string, unknown>) => {
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
          ...(params.inputProps as Record<string, unknown>),
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
                tabIndex={0}
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
                tabIndex={0}
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

    const dateLimits: { minDate?: Moment; maxDate?: Moment } = {};

    if (minDate) {
      dateLimits.minDate = moment(minDate, defaultFormat);
    }

    if (maxDate) {
      dateLimits.maxDate = moment(maxDate, defaultFormat);
    }

    return (
      <div
        className={classNames({
          [classes.dateContainerWrapperDark]: !!darkTheme
        })}
      >
        <DesktopDatePicker
          {...dateLimits}
          open={open}
          className={classNames({
            [classes.dateContainer]: true,
            [classes.darkThemeLabel]: !!darkTheme,
            [classes.dateContainerDark]: !!darkTheme,
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
                [classes.underlineThemeLabel]: !!darkTheme
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

const styled = withStyles(styles)(CustomDatePicker as never);

export default translate('DatePicker')(styled as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
