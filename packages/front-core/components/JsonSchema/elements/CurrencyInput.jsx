import React from 'react';
import PropTypes from 'prop-types';
import makeStyles from '@mui/styles/makeStyles';
import CurrencyTextField from '@lupus-ai/mui-currency-textfield';
import formElement from 'components/JsonSchema/components/formElement';
import stringToNumber from 'helpers/stringToNumber';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';

const styles = {
  currencyWrapper: {
    '& input': {
      textAlign: 'right',
    },
  },
};

const useStyles = makeStyles(styles);

const CurrencyInput = ({
  type,
  value,
  hidden,
  variant,
  readOnly,
  onChange,
  autoFocus,
  onKeyDown,
  formattedValue,
  currencySymbol,
  decimalCharacter,
  digitGroupSeparator,
  decimalPlaces,
  required,
  error,
  width,
  maxWidth,
  noMargin,
}) => {
  const classes = useStyles();
  const ariaLabel = currencySymbol || value;

  const [inputValue, setInputValue] = React.useState(() => {
    const isValueNumber = type === 'number' ? value || value === 0 : value;
    return isValueNumber ? stringToNumber(value) : '';
  });

  const handleChange = React.useCallback(
    (event, newValue) => {
      const {
        target: { value: formatted },
      } = event;

      setInputValue(newValue);

      if (formattedValue && type === 'string') {
        return onChange(formatted);
      }

      return onChange(newValue);
    },
    [formattedValue, onChange, type],
  );

  React.useEffect(() => {
    const propValue = value ? stringToNumber(value) : value;

    const isValueNumber =
      type === 'number' ? propValue || propValue === 0 : propValue;

    if (isValueNumber && propValue !== Number(inputValue)) {
      setInputValue(propValue);
    }
  }, [value, type]);

  if (hidden) return null;

  return (
    <ElementContainer
      required={required}
      bottomSample={true}
      width={width}
      maxWidth={maxWidth}
      noMargin={error ? error : noMargin}
    >
      <CurrencyTextField
        className={classes.currencyWrapper}
        value={inputValue}
        variant={variant}
        disabled={readOnly}
        inputProps={{
          'aria-label': ariaLabel,
        }}
        outputFormat={type}
        onKeyDown={onKeyDown}
        autoFocus={autoFocus}
        decimalPlaces={decimalPlaces}
        currencySymbol={currencySymbol}
        decimalCharacter={decimalCharacter}
        digitGroupSeparator={digitGroupSeparator}
        modifyValueOnWheel={false}
        onChange={handleChange}
      />
    </ElementContainer>
  );
};

CurrencyInput.propTypes = {
  type: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  readOnly: PropTypes.bool,
  autoFocus: PropTypes.bool,
  variant: PropTypes.string,
  formattedValue: PropTypes.bool,
  currencySymbol: PropTypes.string,
  decimalCharacter: PropTypes.string,
  digitGroupSeparator: PropTypes.string,
  decimalPlaces: PropTypes.number,
  onChange: PropTypes.func,
  onKeyDown: PropTypes.func,
};

CurrencyInput.defaultProps = {
  value: '',
  type: 'number',
  readOnly: false,
  autoFocus: false,
  variant: 'standard',
  formattedValue: true,
  currencySymbol: '',
  decimalCharacter: '.',
  digitGroupSeparator: ' ',
  decimalPlaces: 2,
  onChange: () => null,
  onKeyDown: () => null,
};

export default formElement(CurrencyInput);
