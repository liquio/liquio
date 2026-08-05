import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FormHelperText } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import MuiPhoneNumber from 'material-ui-phone-number';
import { filter, head, includes, reduce, startsWith, tail } from 'lodash';
import formElement from 'components/JsonSchema/components/formElement';
import stringPhoneToNumber from 'helpers/stringPhoneToNumber';
import EJVError from 'components/JsonSchema/components/EJVError';
import { allCountries } from './dataCountriesFilter';

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
      overflowY: 'auto',
    },
    '& .dial-code': {
      paddingLeft: 6,
    },
  },
};

const Phone = (props) => {
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
    excludeCountries: excludeCountriesProp,
    defaultCountry: defaultCountryProp,
    onlyCountries: onlyCountriesProp,
    error,
    hidden,
    readOnly,
  } = props;

  const [currentCountry, setCurrentCountry] = useState(defaultCountryProp);
  const [defaultCountry] = useState(defaultCountryProp);
  const [onlyCountries] = useState(onlyCountriesProp);
  const [formattedNumber, setFormattedNumber] = useState('');
  const [errorOtherCountry, setErrorOtherCountry] = useState(false);
  const [filteredCountries, setFilteredCountries] = useState(null);

  const getOnlyCountries = (onlyCountriesArray, filteredCountries) => {
    if (onlyCountriesArray.length === 0) return filteredCountries;

    return filteredCountries.filter((country) =>
      onlyCountriesArray.some((element) => element === country.iso2),
    );
  };

  const excludeCountries = (selectedCountries, excludedCountries) => {
    if (excludedCountries.length === 0) {
      return selectedCountries;
    }
    return filter(
      selectedCountries,
      (selCountry) => !includes(excludedCountries, selCountry.iso2),
    );
  };

  const guessSelectedCountry = (inputNumber, onlyCountries) => {
    const bestGuess = reduce(
      onlyCountries,
      (selectedCountry, country) => {
        if (startsWith(inputNumber, country.dialCode)) {
          if (country.dialCode.length > selectedCountry.dialCode.length) {
            return country;
          }
          if (
            country.dialCode.length === selectedCountry.dialCode.length &&
            country.priority < selectedCountry.priority
          ) {
            return country;
          }
        }
        return selectedCountry;
      },
      { dialCode: '' },
    );

    return bestGuess;
  };

  const formatNumber = React.useCallback(
    (text, patternArg) => {
      let pattern;

      if (disableCountryCode && patternArg) {
        pattern = patternArg.split(' ');
        pattern.shift();
        pattern = pattern.join(' ');
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
        (acc, character) => {
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
    (value, onlyCountries, defaultCountry, onPaste = false) => {
      const inputNumber = value.replace(/\D/g, '');
      let newSelectedCountry;
      let formattedNumber = disableCountryCode ? '' : '+';

      if (!inputNumber) return false;

      newSelectedCountry = guessSelectedCountry(
        inputNumber.substring(0, 6),
        onlyCountries,
        defaultCountry,
      );

      if (!newSelectedCountry?.dialCode) {
        newSelectedCountry = onlyCountries.find(
          ({ iso2 }) => iso2 === defaultCountry,
        );
      }

      const { dialCode, length: isoNumberLength } = newSelectedCountry;

      if (inputNumber.includes(dialCode)) {
        formattedNumber = formatNumber(
          `${inputNumber}`,
          newSelectedCountry.format,
        );
      } else {
        const diff = isoNumberLength - inputNumber.length;

        if (diff === 0) {
          formattedNumber = formatNumber(
            inputNumber,
            newSelectedCountry.format,
          );
        } else if (diff > 0) {
          if (diff <= dialCode.length) {
            if (onPaste) {
              const valueToSlice = dialCode.length - diff;
              const removeDialCodeFromNum = inputNumber.slice(valueToSlice);
              formattedNumber = formatNumber(
                `${dialCode}${removeDialCodeFromNum}`,
                newSelectedCountry.format,
              );
            } else {
              formattedNumber = formatNumber(
                `${inputNumber}`,
                newSelectedCountry.format,
              );
            }
          } else {
            formattedNumber = formatNumber(
              `${dialCode}${inputNumber}`,
              newSelectedCountry.format,
            );
          }
        } else {
          const val = Math.abs(diff);
          formattedNumber = formatNumber(
            `${dialCode}${inputNumber.slice(val)}`,
            newSelectedCountry.format,
          );
        }
      }

      newSelectedCountry.formattedNumber = formattedNumber;

      return newSelectedCountry;
    },
    [disableCountryCode, formatNumber],
  );

  const onPasteChange = (e) => {
    const text = e.clipboardData.getData('Text');
    const {
      target: { selectionStart: caretPosition, value },
    } = e;

    const { iso2, formattedNumber } = setFormat(
      text,
      filteredCountries,
      currentCountry,
      true,
    );

    try {
      if (caretPosition < value.length) {
        throw new Error();
      }

      if (iso2) {
        if (!onlyCountries.includes(iso2)) {
          throw new Error();
        }

        setFormattedNumber(formattedNumber);
        setCurrentCountry(iso2);
        setErrorOtherCountry(false);

        onChange && onChange(`${stringPhoneToNumber(formattedNumber)}`);
      }
    } catch (err) {
      e.preventDefault();
      setErrorOtherCountry(true);
    }
  };

  const onChangeNumber = (value, { countryCode, dialCode }) => {
    if (currentCountry !== countryCode) {
      setFormattedNumber(`+${dialCode}`);
      setCurrentCountry(countryCode || defaultCountry);
    } else {
      setFormattedNumber(`${value}`);
      setCurrentCountry(countryCode);
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
      onChange(null);
    }
  };

  useEffect(() => {
    const init = () => {
      let formattedNumber = '';
      let iso2 = false;

      const filteredCountries = excludeCountries(
        getOnlyCountries(onlyCountriesProp, allCountries),
        excludeCountriesProp,
      );

      const phoneValue =
        value !== parentValue[controlName] ? parentValue[controlName] : value;

      if (phoneValue && Number(phoneValue.replace(/\D/g, ''))) {
        const phoneProp = setFormat(
          phoneValue,
          filteredCountries,
          defaultCountryProp,
        );
        formattedNumber = phoneProp.formattedNumber;
        iso2 = phoneProp.iso2;
      } else {
        for (let i = 0; i < filteredCountries.length; i++) {
          if (
            filteredCountries[i].iso2 === defaultCountryProp &&
            filteredCountries[i].format
          ) {
            formattedNumber = `${filteredCountries[i].format.slice(0, 1)}${
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
          <EJVError error={{ message: t('OtherCountryCode') }} />
        </FormHelperText>
      ) : null}
    </>
  );
};

Phone.propTypes = {
  autoFormat: PropTypes.bool,
  disableCountryCode: PropTypes.bool,
  disableAreaCodes: PropTypes.bool,
  defaultCountry: PropTypes.string,
  excludeCountries: PropTypes.arrayOf(PropTypes.string),
  onlyCountries: PropTypes.arrayOf(PropTypes.string),
  onChange: PropTypes.func,
  sample: PropTypes.string,
  required: PropTypes.bool,
  error: PropTypes.bool,
  bottomSample: PropTypes.bool,
  width: PropTypes.string,
  noMargin: PropTypes.bool,
  notRequiredLabel: PropTypes.string,
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

export default withStyles(styles)(formElement(Phone));
