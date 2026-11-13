import React from 'react';
import type { ChangeEvent, ReactNode, Ref } from 'react';
import setComponentsId from 'helpers/setComponentsId';
import { translate } from 'react-translate';
import type { Translate } from 'react-translate';
import { TextField, MenuItem } from '@mui/material';
import type { TextFieldProps } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import type { Styles } from '@mui/styles/withStyles';
import type { Theme } from '@mui/material/styles';
import InputMask from '@kerim-keskin/react-input-mask';
import customInputStyle from 'assets/jss/components/customInputStyle';

// `ref` is not a prop of a function component under React 18 (and Masked is not wrapped in forwardRef), so
// `props.ref` is always undefined and `inputRef` never receives anything. Kept as it was.
interface MaskedProps {
  ref?: Ref<HTMLInputElement>;
  [key: string]: unknown;
}

const Masked = (props: MaskedProps) => <InputMask {...props} maskPlaceholder={null} inputRef={props.ref} />;

type StringValue = string | number;

// Every prop that is not destructured in render() is spread onto TextField after the explicit ones (including
// `value`, `select`, `classes`, `t`, `setId`, `enum`, ...), so it can override them. All of them are declared.
interface StringElementProps extends Omit<TextFieldProps, 'variant' | 'error' | 'value' | 'onChange' | 'select' | 'type' | 'classes' | 'children' | 'InputProps' | 'SelectProps'> {
  t: Translate;
  classes: Record<string, string>;
  onChange?: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  children?: ReactNode;
  enum?: Record<string, StringValue> | null;
  // Spread onto `TextField` through `rest`, so it replaces the default `"standard"` (the login form passes `outlined`).
  variant?: 'standard' | 'outlined' | 'filled';
  type?: string;
  name?: string;
  placeholder?: string;
  select?: boolean;
  sample?: string;
  error?: ReactNode;
  formControlProps?: Record<string, unknown>;
  description?: string;
  setId?: (elementName: string) => string;
  disabled?: boolean;
  InputProps?: TextFieldProps['InputProps'];
  SelectProps?: TextFieldProps['SelectProps'];
  mask?: string;
  required?: boolean;
  label?: string;
  value?: StringValue;
}

interface StringElementState {
  value: StringValue | undefined;
}

class StringElement extends React.Component<StringElementProps, StringElementState> {
  state: StringElementState = {
    value: this.props.value,
  };

  errorRef = React.createRef<HTMLParagraphElement>();

  static defaultProps = {
    children: '',
    enum: null,
    type: 'string',
    name: '',
    placeholder: '',
    select: false,
    onChange: undefined,
    sample: '',
    formControlProps: {},
    error: null,
    description: '',
    disabled: false,
    InputProps: {},
    SelectProps: {},
    mask: '',
    required: false,
    setId: setComponentsId('string'),
    value: '',
  };

  componentWillReceiveProps(nextProps: StringElementProps) {
    const { value } = nextProps;
    if (value !== this.state.value) {
      this.setState({ value });
    }
  }

  componentDidUpdate(prevProps: StringElementProps) {
    if (!prevProps.error && this.props.error && this.errorRef?.current) {
      setTimeout(() => {
        (this.errorRef.current as HTMLParagraphElement).focus();
      }, 0);
    }
  }

  children = () => {
    const { children } = this.props;

    if (this.props.enum) {
      return Object.values(this.props.enum).map((option, key) => (
        <MenuItem key={key} value={option}>
          {option}
        </MenuItem>
      ));
    }

    return children;
  };

  render() {
    const { name, sample, error, label, disabled, InputProps, SelectProps, type, mask, required, placeholder, onChange, ...rest } = this.props;
    const { value } = this.state;

    const select = this.props.select || !!this.props.enum;
    return (
      <TextField
        variant="standard"
        name={name}
        disabled={disabled}
        margin="normal"
        placeholder={placeholder}
        select={select}
        label={label + (required ? '*' : '')}
        value={value}
        onChange={onChange}
        error={!!error}
        FormHelperTextProps={
          error
            ? {
                ref: this.errorRef,
                tabIndex: -1,
                role: 'alert',
                'aria-live': 'assertive',
              }
            : {}
        }
        helperText={!disabled && (error || sample)}
        InputProps={{ ...InputProps, inputComponent: Masked }}
        inputProps={{ mask }}
        SelectProps={SelectProps}
        type={type}
        InputLabelProps={{
          shrink: !!value,
        }}
        {...rest}
      >
        {this.children()}
      </TextField>
    );
  }
}

// customInputStyle is inferred with widened values (`position: string`), which MUI's CSS typing rejects.
const styled = withStyles(customInputStyle as Styles<Theme, {}, string>)(StringElement);
export default translate('Elements')(styled);
