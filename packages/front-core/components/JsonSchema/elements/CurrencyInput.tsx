import React from 'react';
import makeStyles from '@mui/styles/makeStyles';
import CurrencyTextField from '@lupus-ai/mui-currency-textfield';
import formElement from 'components/JsonSchema/components/formElement';
import stringToNumber from 'helpers/stringToNumber';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';

const styles = {
  currencyWrapper: {
    '& input': {
      textAlign: 'right' as const,
    },
  },
};

const useStyles = makeStyles(styles);

interface CurrencyInputProps {
  type?: string;
  value?: number | string;
  hidden?: boolean;
  variant?: string;
  readOnly?: boolean;
  onChange: (value: unknown) => void;
  autoFocus?: boolean;
  onKeyDown?: (event: React.KeyboardEvent) => void;
  formattedValue?: boolean;
  currencySymbol?: string;
  decimalCharacter?: string;
  digitGroupSeparator?: string;
  decimalPlaces?: number;
  required?: boolean;
  error?: unknown;
  width?: number | string;
  maxWidth?: number | string;
  noMargin?: boolean;
}

const CurrencyInput = ({
  type = 'number',
  value = '',
  hidden,
  variant = 'standard',
  readOnly = false,
  onChange = () => null,
  autoFocus = false,
  onKeyDown = () => null,
  formattedValue = true,
  currencySymbol = '',
  decimalCharacter = '.',
  digitGroupSeparator = ' ',
  decimalPlaces = 2,
  required,
  error,
  width,
  maxWidth,
  noMargin,
}: CurrencyInputProps) => {
  const classes = useStyles();
  const ariaLabel = currencySymbol || value;

  const [inputValue, setInputValue] = React.useState<unknown>(() => {
    const isValueNumber = type === 'number' ? value || value === 0 : value;
    return isValueNumber ? stringToNumber(value) : '';
  });

  const handleChange = React.useCallback(
    (event: { target: { value: unknown } }, newValue: unknown) => {
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
      noMargin={error ? (error as never) : noMargin}
    >
      <CurrencyTextField
        className={classes.currencyWrapper}
        value={inputValue as number | string}
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

export default formElement(CurrencyInput as unknown as React.ComponentType<Record<string, unknown>>);
