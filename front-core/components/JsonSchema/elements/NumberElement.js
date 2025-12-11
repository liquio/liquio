/* eslint-disable react/jsx-no-duplicate-props */
import React from 'react';
import PropTypes from 'prop-types';
import objectPath from 'object-path';
import NumberFormat from 'react-number-format';
import { TextField } from '@mui/material';
import MobileDetect from 'mobile-detect';
import FieldLabel from 'components/JsonSchema/components/FieldLabel';
import classNames from 'classnames';
import withStyles from '@mui/styles/withStyles';

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

const NumberFormatCustom = ({ ref, onChange, format, ...props }) => (
  <NumberFormat
    {...props}
    getInputRef={ref}
    format={format}
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

class NumberElement extends React.Component {
  constructor(props) {
    super(props);
    this.state = { value: props.value };
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

  componentWillReceiveProps = ({ value: nextValue, toFixed }) => {
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
    const { rootDocument, stepName, path, documentValue } = this.props;
    const root = documentValue ? documentValue.data : rootDocument.data;
    return objectPath.get(root || {}, [stepName].concat(path).join('.'));
  };

  handleChange = ({ target: { value } }) => {
    const { onChange, toFixed } = this.props;
    const { value: stateValue } = this.state;
    if (value === stateValue) return;

    this.setState({ value: value.replace(/ /g, '') }, () => {
      this.canChange() &&
        onChange(parseFloat(stringToNumber(value).toFixed(toFixed)));
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

  handleKeyPress = (event) => {
    const inputValue = event.which;
    if (!(inputValue >= 46 && inputValue <= 57) && inputValue !== 44) {
      event.preventDefault();
    }
  };

  placeholder = () => {
    const { toFixed, value } = this.props;
    return !value ? String(Number(0).toFixed(toFixed)) : '0';
  };

  replaceMaskToFormat = (mask) => {
    if (!mask) return null;
    return mask.replace(/9/g, '#');
  };

  getDescription = () => {
    const {
      description,
      rootDocument
    } = this.props;

    if (typeof description === 'string') {
      const result = evaluate(description, rootDocument?.data);

      if (result instanceof Error) return description;

      return result;
    }
    return description;
  };

  withTooltip = () => {
    const {
      notRequiredLabel
    } = this.props;

    const isLonger = (string) =>
      (notRequiredLabel ? `${this.getDescription()} (${notRequiredLabel})` : string || '').length > SYMBOLS_LIMIT;

    return isLonger(this.getDescription());
  }

  numberElement = () => {
    const {
      path,
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
        {...this.props}
        id={id}
        path={path}
        type="text"
        fullWidth={true}
        value={value}
        className={classNames({
          [classes.formControlDisabled]: readOnly
        })}
        placeholder={this.placeholder()}
        onKeyPress={this.handleKeyPress}
        onChange={this.handleChange}
        onBlur={this.handleBlur}
        onFocus={this.handleFocus}
        disabled={readOnly}
        required={false}
        label={
          description ? (
            <FieldLabel
              description={this.getDescription()}
              required={required}
              notRequiredLabel={notRequiredLabel}
            />
          ) : null
        }
        InputProps={{
          readOnly,
          inputComponent: NumberFormatCustom,
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
        variant={typography}
        error={error}
        bottomSample={true}
        width={formWidth}
        maxWidth={maxWidth}
        noMargin={noMargin}
      >
        {
          this.withTooltip() ? <CustomWidthTooltip title={title} placement="bottom-start">
            {this.numberElement()}
          </CustomWidthTooltip> : this.numberElement()
        }

      </ElementContainer>
    );
  };
}

NumberElement.propTypes = {
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  onChange: PropTypes.func,
  required: PropTypes.bool,
  toFixed: PropTypes.number,
  placeholder: PropTypes.bool,
  rootDocument: PropTypes.object,
  stepName: PropTypes.string,
  path: PropTypes.array,
  mask: PropTypes.string,
  widthMobile: PropTypes.string,
};

NumberElement.defaultProps = {
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

export default withStyles(style)(NumberElement);
