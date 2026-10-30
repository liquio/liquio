/* eslint-disable react/jsx-no-duplicate-props */
import React from 'react';
import objectPath from 'object-path';
import NumberFormat from 'react-number-format';
import { TextField } from '@mui/material';
import MobileDetect from 'mobile-detect';
import FieldLabel from 'components/JsonSchema/components/FieldLabel';
import classNames from 'classnames';
import withStyles, { WithStyles } from '@mui/styles/withStyles';

import stringToNumber from 'helpers/stringToNumber';

import ElementContainer from '../components/ElementContainer';
import CustomWidthTooltip from 'components/JsonSchema/elements/CustomWidthTooltip';
import evaluate from 'helpers/evaluate';

const style = () => ({
  formControlDisabled: {
    '& .MuiFormLabel-root.MuiInputLabel-root.Mui-disabled': {
      color: '#595959',
    },
  },
});

interface NumberFormatCustomProps {
  ref?: React.Ref<HTMLInputElement>;
  onChange: (event: { target: { value: string } }) => void;
  format?: string | null;
  [key: string]: unknown;
}

const NumberFormatCustom = ({ ref, onChange, format, ...props }: NumberFormatCustomProps) => (
  <NumberFormat
    {...(props as Record<string, unknown>)}
    getInputRef={ref}
    format={format as never}
    allowedDecimalSeparators={['.', ',']}
    onValueChange={(values) => {
      onChange({
        target: {
          value: values.value,
        },
      });
    }}
    thousandSeparator={' '}
  />
);

const SYMBOLS_LIMIT = 60;

interface NumberElementProps extends WithStyles<typeof style> {
  value?: number | string | null;
  onChange?: ((value: number) => void) | null;
  onBlur?: () => void;
  required?: boolean;
  toFixed?: number;
  placeholder?: boolean;
  rootDocument: { data?: Record<string, unknown> };
  stepName?: string;
  path?: Array<string | number>;
  mask?: string | null;
  widthMobile?: string | null;
  hidden?: boolean;
  cleanWhenHidden?: boolean;
  keepSelection?: boolean;
  documentValue?: { data?: Record<string, unknown> };
  readOnly?: boolean;
  description?: string;
  notRequiredLabel?: string;
  sample?: string;
  width?: number | string;
  maxWidth?: number | string;
  error?: unknown;
  noMargin?: boolean;
  checkRequired?: boolean;
  schema: { sample?: string };
  typography?: string;
}

interface NumberElementState {
  value: number | string | null;
}

class NumberElement extends React.Component<NumberElementProps, NumberElementState> {
  static defaultProps = {
    value: null,
    onChange: () => null,
    required: false,
    toFixed: 0,
    placeholder: false,
    rootDocument: {},
    stepName: '',
    path: [],
    mask: null,
    widthMobile: null,
  };

  constructor(props: NumberElementProps) {
    super(props);
    this.state = { value: props.value ?? null };
  }

  canChange = () => {
    const { onChange, hidden, cleanWhenHidden, keepSelection } = this.props;
    return onChange && !(hidden && cleanWhenHidden && !keepSelection);
  };

  componentDidMount() {
    const { value, onChange, required } = this.props;

    if (required && value === null && onChange) {
      onChange(0);
    }
  }

  componentWillReceiveProps = ({ value: nextValue, toFixed }: NumberElementProps) => {
    const { value } = this.state;
    const parsedValue = stringToNumber(value);
    const placeholderNeeded = this.checkIfValue() === undefined;

    if (parsedValue !== nextValue) {
      this.setState({
        value: placeholderNeeded
          ? ''
          : Number(
              String(Number(nextValue).toFixed(toFixed)).replace(/ /g, ''),
            ),
      });
    }
  };

  checkIfValue = () => {
    const { rootDocument, stepName, path = [], documentValue } = this.props;
    const root = documentValue ? documentValue.data : rootDocument.data;
    return objectPath.get(root || {}, ([stepName] as Array<string | number | undefined>).concat(path).join('.'));
  };

  handleChange = ({ target: { value } }: { target: { value: string } }) => {
    const { onChange, toFixed } = this.props;
    const { value: stateValue } = this.state;
    if (value === stateValue) return;

    this.setState({ value: value.replace(/ /g, '') }, () => {
      this.canChange() &&
        onChange?.(parseFloat((stringToNumber(value) as number).toFixed(toFixed)));
    });
  };

  handleBlur = () => {
    const { value, toFixed, onBlur } = this.props;
    this.setState(
      {
        value: String(Number(value).toFixed(toFixed)),
      },
      onBlur,
    );
  };

  handleFocus = () => {
    const { value } = this.state;
    const { toFixed } = this.props;
    if (value === Number().toFixed(toFixed)) {
      this.setState({ value: '' });
    }
  };

  handleKeyPress = (event: React.KeyboardEvent) => {
    const inputValue = (event as unknown as { which: number }).which;
    if (!(inputValue >= 46 && inputValue <= 57) && inputValue !== 44) {
      event.preventDefault();
    }
  };

  placeholder = () => {
    const { toFixed, value } = this.props;
    return !value ? String(Number(0).toFixed(toFixed)) : '0';
  };

  replaceMaskToFormat = (mask?: string | null) => {
    if (!mask) return null;
    return mask.replace(/9/g, '#');
  };

  getDescription = (): React.ReactNode => {
    const {
      description,
      rootDocument
    } = this.props;

    if (typeof description === 'string') {
      const result = evaluate(description, rootDocument?.data);

      if (result instanceof Error) return description;

      return result as React.ReactNode;
    }
    return description;
  };

  withTooltip = () => {
    const {
      notRequiredLabel
    } = this.props;

    const isLonger = (string: React.ReactNode) =>
      (notRequiredLabel ? `${this.getDescription()} (${notRequiredLabel})` : (string as string) || '').length > SYMBOLS_LIMIT;

    return isLonger(this.getDescription());
  }

  numberElement = () => {
    const {
      path = [],
      description,
      required,
      readOnly,
      mask,
      notRequiredLabel,
      classes,
    } = this.props;
    const { value } = this.state;

    const id = (path || []).join('-');

    return (
      <TextField
        {...(this.props as unknown as Record<string, unknown>)}
        id={id}
        type="text"
        fullWidth={true}
        value={value}
        className={classNames({
          [classes.formControlDisabled]: !!readOnly
        })}
        placeholder={this.placeholder()}
        onKeyPress={this.handleKeyPress}
        onChange={this.handleChange as never}
        onBlur={this.handleBlur}
        onFocus={this.handleFocus}
        disabled={readOnly}
        required={false}
        label={
          description ? (
            <FieldLabel
              description={this.getDescription() as string}
              required={required}
              notRequiredLabel={notRequiredLabel}
            />
          ) : null
        }
        InputProps={{
          readOnly,
          inputComponent: NumberFormatCustom as never,
        }}
        inputProps={{
          format: this.replaceMaskToFormat(mask),
          'aria-labelledby': id,
        }}
        InputLabelProps={{
          shrink: value || this.placeholder() ? true : false,
        }}
        variant={'standard'}
      />
    )
  }

  render = () => {
    const {
      sample,
      required,
      width,
      maxWidth,
      error,
      hidden,
      noMargin,
      checkRequired,
      schema,
      widthMobile,
      typography,
      notRequiredLabel
    } = this.props;

    if (hidden) return null;

    const md = new MobileDetect(window.navigator.userAgent);
    const isMobile = !!md.mobile();
    const formWidth = isMobile && widthMobile ? widthMobile : width;
    const title = notRequiredLabel ? `${this.getDescription()} (${notRequiredLabel})` : this.getDescription();
    return (
      <ElementContainer
        sample={sample || schema.sample}
        required={required || checkRequired}
        variant={typography as never}
        error={error as never}
        bottomSample={true}
        width={formWidth}
        maxWidth={maxWidth}
        noMargin={noMargin}
      >
        {
          this.withTooltip() ? <CustomWidthTooltip title={title as string} placement="bottom-start">
            {this.numberElement()}
          </CustomWidthTooltip> : this.numberElement()
        }

      </ElementContainer>
    );
  };
}

export default withStyles(style)(NumberElement);
