import React, { useState, useEffect } from 'react';
import { FormHelperText } from '@mui/material';
import withStyles, { WithStyles } from '@mui/styles/withStyles';
import MuiPhoneNumber from 'material-ui-phone-number';
import { filter, head, includes, reduce, startsWith, tail } from 'lodash';
import formElement from 'components/JsonSchema/components/formElement';
import stringPhoneToNumber from 'helpers/stringPhoneToNumber';
import EJVError from 'components/JsonSchema/components/EJVError';
import { allCountries } from './dataCountriesFilter';
import type { CountryItem } from './dataCountriesFilter';

const styles = {
  hideAction: {
    '& .MuiInputAdornment-root': {
      display: 'none',
    },
    '& button': {
      display: 'none',
    },
  },
  dropdownClass: {
    '& .MuiList-root.MuiMenu-list': {
      maxHeight: 200,
      overflowY: 'auto' as const,
    },
    '& .dial-code': {
      paddingLeft: 6,
    },
  },
};

interface PhoneProps extends WithStyles<typeof styles> {
  t: (key: string) => string;
  disableAreaCodes?: boolean;
  onChange?: ((value: string | null) => void) | null;
  value?: string;
  disableCountryCode?: boolean;
  autoFormat?: boolean;
  enableLongNumbers?: boolean;
  name?: string;
  parentValue: Record<string, unknown>;
  excludeCountries?: string[];
  defaultCountry?: string;
  onlyCountries?: string[];
  error?: boolean;
  hidden?: boolean;
  readOnly?: boolean;
}

const Phone = (props: PhoneProps) => {
  const {
    t,
    classes,
    disableAreaCodes,
    onChange,
    value,
    disableCountryCode,
    autoFormat,
    enableLongNumbers,
    name: controlName,
    parentValue,
    excludeCountries: excludeCountriesProp = [],
    defaultCountry: defaultCountryProp = 'ua',
    onlyCountries: onlyCountriesProp = [],
    error,
    hidden,
    readOnly,
  } = props;

  const [currentCountry, setCurrentCountry] = useState(defaultCountryProp);
  const [defaultCountry] = useState(defaultCountryProp);
  const [onlyCountries] = useState(onlyCountriesProp);
  const [formattedNumber, setFormattedNumber] = useState('');
  const [errorOtherCountry, setErrorOtherCountry] = useState(false);
  const [filteredCountries, setFilteredCountries] = useState<CountryItem[] | null>(null);

  const getOnlyCountries = (onlyCountriesArray: string[], filteredCountries: CountryItem[]) => {
    if (onlyCountriesArray.length === 0) return filteredCountries;

    return filteredCountries.filter((country) =>
      onlyCountriesArray.some((element) => element === country.iso2),
    );
  };

  const excludeCountries = (selectedCountries: CountryItem[], excludedCountries: string[]) => {
    if (excludedCountries.length === 0) {
      return selectedCountries;
    }
    return filter(
      selectedCountries,
      (selCountry) => !includes(excludedCountries, selCountry.iso2),
    );
  };

  const guessSelectedCountry = (inputNumber: string, onlyCountries: CountryItem[]) => {
    const bestGuess = reduce(
      onlyCountries,
      (selectedCountry, country) => {
        if (startsWith(inputNumber, country.dialCode)) {
          if (country.dialCode.length > selectedCountry.dialCode.length) {
            return country;
          }
          if (
            country.dialCode.length === selectedCountry.dialCode.length &&
            (country.priority as number) < (selectedCountry.priority as number)
          ) {
            return country;
          }
        }
        return selectedCountry;
      },
      { dialCode: '' } as CountryItem,
    );

    return bestGuess;
  };

  const formatNumber = React.useCallback(
    (text: string, patternArg?: string) => {
      let pattern;

      if (disableCountryCode && patternArg) {
        const patternParts = patternArg.split(' ');
        patternParts.shift();
        pattern = patternParts.join(' ');
      } else {
        pattern = patternArg;
      }

      if (!text || text.length === 0) {
        return disableCountryCode ? '' : '+';
      }

      if ((text && text.length < 2) || !pattern || !autoFormat) {
        return disableCountryCode ? text : `+${text}`;
      }

      const formattedObject = reduce(
        pattern,
        (acc: { formattedText: string; remainingText: string[] }, character: string) => {
          if (acc.remainingText.length === 0) {
            return acc;
          }

          if (character !== '.') {
            return {
              formattedText: acc.formattedText + character,
              remainingText: acc.remainingText,
            };
          }

          return {
            formattedText: acc.formattedText + head(acc.remainingText),
            remainingText: tail(acc.remainingText),
          };
        },
        {
          formattedText: '',
          remainingText: text.split(''),
        },
      );

      let formattedNumber;
      if (enableLongNumbers) {
        formattedNumber =
          formattedObject.formattedText +
          formattedObject.remainingText.join('');
      } else {
        formattedNumber = formattedObject.formattedText;
      }

      if (formattedNumber.includes('(') && !formattedNumber.includes(')')) {
        formattedNumber += ')';
      }

      return formattedNumber;
    },
    [autoFormat, enableLongNumbers, disableCountryCode],
  );

  const setFormat = React.useCallback(
    (value: string, onlyCountries: CountryItem[], defaultCountry: string, onPaste = false) => {
      const inputNumber = value.replace(/\D/g, '');
      let newSelectedCountry: CountryItem | undefined;
      let formattedNumber = disableCountryCode ? '' : '+';

      if (!inputNumber) return false;

      newSelectedCountry = guessSelectedCountry(
        inputNumber.substring(0, 6),
        onlyCountries,
      );

      if (!newSelectedCountry?.dialCode) {
        newSelectedCountry = onlyCountries.find(
          ({ iso2 }) => iso2 === defaultCountry,
        );
      }

      const { dialCode, length: isoNumberLength } = newSelectedCountry as CountryItem;

      if (inputNumber.includes(dialCode)) {
        formattedNumber = formatNumber(
          `${inputNumber}`,
          (newSelectedCountry as CountryItem).format,
        );
      } else {
        const diff = (isoNumberLength as number) - inputNumber.length;

        if (diff === 0) {
          formattedNumber = formatNumber(
            inputNumber,
            (newSelectedCountry as CountryItem).format,
          );
        } else if (diff > 0) {
          if (diff <= dialCode.length) {
            if (onPaste) {
              const valueToSlice = dialCode.length - diff;
              const removeDialCodeFromNum = inputNumber.slice(valueToSlice);
              formattedNumber = formatNumber(
                `${dialCode}${removeDialCodeFromNum}`,
                (newSelectedCountry as CountryItem).format,
              );
            } else {
              formattedNumber = formatNumber(
                `${inputNumber}`,
                (newSelectedCountry as CountryItem).format,
              );
            }
          } else {
            formattedNumber = formatNumber(
              `${dialCode}${inputNumber}`,
              (newSelectedCountry as CountryItem).format,
            );
          }
        } else {
          const val = Math.abs(diff);
          formattedNumber = formatNumber(
            `${dialCode}${inputNumber.slice(val)}`,
            (newSelectedCountry as CountryItem).format,
          );
        }
      }

      (newSelectedCountry as CountryItem).formattedNumber = formattedNumber;

      return newSelectedCountry as CountryItem;
    },
    [disableCountryCode, formatNumber],
  );

  const onPasteChange = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('Text');
    const target = e.target as HTMLInputElement;
    const caretPosition = target.selectionStart as number;
    const value = target.value;

    const { iso2, formattedNumber } = setFormat(
      text,
      filteredCountries as CountryItem[],
      currentCountry,
      true,
    ) as CountryItem;

    try {
      if (caretPosition < value.length) {
        throw new Error();
      }

      if (iso2) {
        if (!onlyCountries.includes(iso2)) {
          throw new Error();
        }

        setFormattedNumber(formattedNumber as string);
        setCurrentCountry(iso2);
        setErrorOtherCountry(false);

        onChange && onChange(`${stringPhoneToNumber(formattedNumber)}`);
      }
    } catch (err) {
      e.preventDefault();
      setErrorOtherCountry(true);
    }
  };

  const onChangeNumber = (value: string, { countryCode, dialCode }: { countryCode?: string; dialCode?: string }) => {
    if (currentCountry !== countryCode) {
      setFormattedNumber(`+${dialCode}`);
      setCurrentCountry(countryCode || defaultCountry);
    } else {
      setFormattedNumber(`${value}`);
      setCurrentCountry(countryCode as string);
      setErrorOtherCountry(false);
    }

    const result = stringPhoneToNumber(value);

    onChange && onChange(`${result}`);
  };

  const onBlur = () => {
    const valueIsCode = (filteredCountries || []).some((country) => {
      const { dialCode, iso2 } = country || {};
      const valueInCode = value === dialCode && iso2 === defaultCountryProp;

      return valueInCode;
    });

    if (valueIsCode) {
      onChange?.(null);
    }
  };

  useEffect(() => {
    const init = () => {
      let formattedNumber = '';
      let iso2: string | false = false;

      const filteredCountries = excludeCountries(
        getOnlyCountries(onlyCountriesProp, allCountries),
        excludeCountriesProp,
      );

      const phoneValue =
        value !== parentValue[controlName as string] ? (parentValue[controlName as string] as string) : value;

      if (phoneValue && Number(phoneValue.replace(/\D/g, ''))) {
        const phoneProp = setFormat(
          phoneValue,
          filteredCountries,
          defaultCountryProp,
        ) as CountryItem;
        formattedNumber = phoneProp.formattedNumber as string;
        iso2 = phoneProp.iso2;
      } else {
        for (let i = 0; i < filteredCountries.length; i++) {
          if (
            filteredCountries[i].iso2 === defaultCountryProp &&
            filteredCountries[i].format
          ) {
            formattedNumber = `${(filteredCountries[i].format as string).slice(0, 1)}${
              filteredCountries[i].dialCode
            }`;
          }
        }
      }

      setFormattedNumber(formattedNumber);
      setFilteredCountries(filteredCountries);
      setCurrentCountry(iso2 || defaultCountryProp);
    };
    init();
  }, [
    controlName,
    defaultCountryProp,
    excludeCountriesProp,
    onlyCountriesProp,
    parentValue,
    setFormat,
    value,
  ]);

  if (hidden) return null;

  return (
    <>
      <MuiPhoneNumber
        onlyCountries={onlyCountries}
        inputClass={onlyCountries.length === 1 ? classes.hideAction : ''}
        onChange={onChangeNumber}
        defaultCountry={currentCountry}
        countryCodeEditable={false}
        disableAreaCodes={disableAreaCodes}
        inputProps={{
          'aria-label': t('PhoneNumberTitle'),
          value: formattedNumber,
          onPaste: onPasteChange,
        }}
        dropdownClass={classes.dropdownClass}
        onBlur={onBlur}
        disabled={readOnly}
        error={error}
      />
      {errorOtherCountry ? (
        <FormHelperText error={errorOtherCountry}>
          <EJVError error={{ message: t('OtherCountryCode') } as never} />
        </FormHelperText>
      ) : null}
    </>
  );
};

Phone.defaultProps = {
  autoFormat: true,
  disableCountryCode: false,
  disableAreaCodes: true,
  defaultCountry: 'ua',
  onlyCountries: [],
  excludeCountries: [],
  onChange: () => null,
  sample: null,
  required: false,
  error: false,
  bottomSample: true,
  width: '100%',
  noMargin: false,
  notRequiredLabel: null,
};

const styled = withStyles(styles)(formElement(Phone as unknown as React.ComponentType<Record<string, unknown>>));

export default styled as unknown as React.ComponentType<Record<string, unknown>>;
