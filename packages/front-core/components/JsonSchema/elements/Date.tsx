import React from 'react';
import { translate } from 'react-translate';
import moment from 'moment';
import withStyles, { WithStyles } from '@mui/styles/withStyles';
import CustomDatePickerUntyped from 'components/CustomInput/CustomDatePicker';
import TextFieldDummyUntyped from 'components/CustomInput/TextFieldDummy';
import evaluate from 'helpers/evaluate';
import FieldLabel from '../components/FieldLabel';
import ElementContainer from '../components/ElementContainer';

const CustomDatePicker = CustomDatePickerUntyped as unknown as React.ComponentType<Record<string, unknown>>;
const TextFieldDummy = TextFieldDummyUntyped as unknown as React.ComponentType<Record<string, unknown>>;

interface DateElementProps extends WithStyles<{}> {
  onChange?: (value: unknown) => void;
  children?: React.ReactNode;
  placeholder?: string;
  sample?: string | boolean;
  error?: unknown;
  description?: string;
  path?: Array<string | number>;
  readOnly?: boolean;
  InputProps?: Record<string, unknown>;
  required?: boolean;
  value?: string | number;
  minDate?: string | null;
  maxDate?: string | null;
  dateFormat?: string;
  allowedDays?: string | boolean;
  disabledDays?: string | boolean;
  notRequiredLabel?: string | boolean;
  darkTheme?: boolean;
  rootDocument: { data: Record<string, unknown> };
  stepName?: string;
  documents?: { rootDocument?: { data?: Record<string, unknown> } };
  isPopup?: boolean;
  width?: number | string;
  maxWidth?: number | string;
  hidden?: boolean;
  noMargin?: boolean;
}

interface DateElementState {
  value?: string | number;
}

class DateElement extends React.Component<DateElementProps, DateElementState> {
  static defaultProps = {
    children: '',
    placeholder: '',
    onChange: undefined,
    sample: '',
    error: null,
    description: '',
    readOnly: false,
    InputProps: {},
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

  constructor(props: DateElementProps) {
    super(props);
    this.state = {
      value: this.props.value,
    };
  }

  handleChange = (value: string | number) => {
    const { onChange } = this.props;
    onChange && onChange(value || undefined);
    this.setState({ value });
  };

  evalDate = (dateFunc?: string | boolean | null) => {
    if (!dateFunc) return null;

    const {
      rootDocument: { data },
      stepName,
      documents,
      isPopup,
    } = this.props;

    const dateVal = isPopup
      ? evaluate(
          dateFunc as string,
          moment,
          (documents?.rootDocument?.data || {})[stepName as string],
          documents?.rootDocument?.data,
          documents?.rootDocument?.data,
        )
      : evaluate(
          dateFunc as string,
          moment,
          data[stepName as string],
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

  componentWillReceiveProps = (nextProps: DateElementProps) => {
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
      path = [],
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
        error={error as never}
        className={(classes as Record<string, string>).formControl}
        sample={sample as never}
        bottomSample={true}
        width={width}
        maxWidth={maxWidth}
        noMargin={noMargin}
        notRequiredLabel={notRequiredLabel as never}
      >
        <Component
          incomingFormat={dateFormat}
          placeholder={placeholder}
          label={
            <FieldLabel
              description={description}
              required={required}
              notRequiredLabel={notRequiredLabel as never}
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

const styled = withStyles({})(DateElement as never);
export default translate('Elements')(styled as never) as unknown as React.ComponentType<Record<string, unknown>>;
