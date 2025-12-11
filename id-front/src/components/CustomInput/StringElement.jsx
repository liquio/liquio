import React from 'react';
import PropTypes from 'prop-types';
import setComponentsId from 'helpers/setComponentsId';
import { translate } from 'react-translate';
import { TextField, MenuItem } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import InputMask from 'react-input-mask';
import customInputStyle from 'assets/jss/components/customInputStyle';

const Masked = (props) => <InputMask {...props} maskChar="" inputRef={props.ref} />;

Masked.propTypes = {
  ref: PropTypes.node,
};

Masked.defaultProps = {
  ref: undefined,
};

class StringElement extends React.Component {
  state = {
    value: this.props.value,
  };

  errorRef = React.createRef();

  componentWillReceiveProps(nextProps) {
    const { value } = nextProps;
    if (value !== this.state.value) {
      this.setState({ value });
    }
  }

  componentDidUpdate(prevProps) {
    if (!prevProps.error && this.props.error && this.errorRef?.current) {
      setTimeout(() => {
        this.errorRef.current.focus();
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
StringElement.propTypes = {
  onChange: PropTypes.func,
  children: PropTypes.node,
  enum: PropTypes.object,
  type: PropTypes.string,
  name: PropTypes.string,
  placeholder: PropTypes.string,
  select: PropTypes.bool,
  sample: PropTypes.string,
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  formControlProps: PropTypes.object,
  description: PropTypes.string,
  classes: PropTypes.object.isRequired,
  setId: PropTypes.func,
  disabled: PropTypes.bool,
  InputProps: PropTypes.object,
  SelectProps: PropTypes.object,
  mask: PropTypes.string,
  required: PropTypes.bool,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

StringElement.defaultProps = {
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

const styled = withStyles(customInputStyle)(StringElement);
export default translate('Elements')(styled);
