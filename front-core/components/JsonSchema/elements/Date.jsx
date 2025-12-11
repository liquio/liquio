import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import moment from 'moment';
import withStyles from '@mui/styles/withStyles';
import CustomDatePicker from 'components/CustomInput/CustomDatePicker';
import TextFieldDummy from 'components/CustomInput/TextFieldDummy';
import evaluate from 'helpers/evaluate';
import FieldLabel from '../components/FieldLabel';
import ElementContainer from '../components/ElementContainer';

class DateElement extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      value: this.props.value,
    };
  }

  handleChange = (value) => {
    const { onChange } = this.props;
    onChange && onChange(value || undefined);
    this.setState({ value });
  };

  evalDate = (dateFunc) => {
    if (!dateFunc) return null;

    const {
      rootDocument: { data },
      stepName,
      documents,
      isPopup,
    } = this.props;

    const dateVal = isPopup
      ? evaluate(
          dateFunc,
          moment,
          documents?.rootDocument?.data[stepName],
          documents?.rootDocument?.data,
          documents?.rootDocument?.data,
        )
      : evaluate(
          dateFunc,
          moment,
          data[stepName],
          data,
          documents?.rootDocument?.data,
        );

    if (dateVal instanceof Error) return null;

    return dateVal;
  };

  setDateLimits = () => {
    const {
      minDate: minDateOrigin,
      maxDate: maxDateOrigin,
      allowedDays: allowedDaysOrigin,
      disabledDays: disabledDaysOrigin,
    } = this.props;

    return {
      minDate: this.evalDate(minDateOrigin),
      maxDate: this.evalDate(maxDateOrigin),
      allowedDays: this.evalDate(allowedDaysOrigin),
      disabledDays: this.evalDate(disabledDaysOrigin),
    };
  };

  componentWillReceiveProps = (nextProps) => {
    const { value } = nextProps;
    if (value !== this.state.value) {
      this.setState({ value });
    }
  };

  render = () => {
    const {
      classes,
      sample,
      error,
      description,
      readOnly,
      InputProps,
      required,
      placeholder,
      path,
      width,
      maxWidth,
      hidden,
      noMargin,
      dateFormat,
      notRequiredLabel,
      darkTheme,
    } = this.props;
    const { value } = this.state;

    const { minDate, maxDate, allowedDays, disabledDays } =
      this.setDateLimits();

    const Component = readOnly ? TextFieldDummy : CustomDatePicker;

    if (hidden) return null;

    return (
      <ElementContainer
        error={error}
        className={classes.formControl}
        sample={sample}
        bottomSample={true}
        width={width}
        maxWidth={maxWidth}
        noMargin={noMargin}
        notRequiredLabel={notRequiredLabel}
      >
        <Component
          incomingFormat={dateFormat}
          placeholder={placeholder}
          label={
            <FieldLabel
              description={description}
              required={required}
              notRequiredLabel={notRequiredLabel}
            />
          }
          value={value}
          date={value}
          onChange={this.handleChange}
          error={!!error}
          InputProps={InputProps}
          id={path.join('-')}
          minDate={minDate}
          maxDate={maxDate}
          allowedDays={allowedDays}
          disabledDays={disabledDays}
          darkTheme={darkTheme}
        />
      </ElementContainer>
    );
  };
}

DateElement.propTypes = {
  onChange: PropTypes.func,
  children: PropTypes.node,
  enum: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  type: PropTypes.string,
  placeholder: PropTypes.string,
  select: PropTypes.bool,
  sample: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  error: PropTypes.object,
  formControlProps: PropTypes.object,
  description: PropTypes.string,
  classes: PropTypes.object.isRequired,
  path: PropTypes.array,
  readOnly: PropTypes.bool,
  InputProps: PropTypes.object,
  SelectProps: PropTypes.object,
  mask: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(RegExp)]),
  required: PropTypes.bool,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  minDate: PropTypes.string,
  maxDate: PropTypes.string,
  dateFormat: PropTypes.string,
  allowedDays: PropTypes.string,
  disabledDays: PropTypes.string,
  notRequiredLabel: PropTypes.string,
  darkTheme: PropTypes.bool,
};

DateElement.defaultProps = {
  children: '',
  enum: null,
  type: 'string',
  placeholder: '',
  select: false,
  onChange: undefined,
  sample: '',
  formControlProps: {},
  error: null,
  description: '',
  readOnly: false,
  InputProps: {},
  SelectProps: {},
  mask: '',
  required: false,
  path: [],
  value: '',
  minDate: null,
  maxDate: null,
  dateFormat: 'DD.MM.YYYY',
  allowedDays: false,
  disabledDays: false,
  notRequiredLabel: false,
  darkTheme: false,
};

const styled = withStyles({})(DateElement);
export default translate('Elements')(styled);
