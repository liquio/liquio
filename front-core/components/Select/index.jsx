/* eslint-disable react/jsx-no-duplicate-props */
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import classNames from 'classnames';
import MobileDetect from 'mobile-detect';
import { TextField, CircularProgress, Popper } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import Autocomplete from '@mui/material/Autocomplete';
import ListboxComponent, {
  getTextWidth,
  getFont,
} from 'components/Select/components/ListboxComponent';
import CustomWidthTooltip from 'components/JsonSchema/elements/CustomWidthTooltip';
import styles from 'components/Select/components/styles';
import storage from 'helpers/storage';

const md = new MobileDetect(window.navigator.userAgent);
const isMobile = !!md.mobile();
const actionsWidth = 52;

const MultiSelect = ({
  t,
  id,
  error,
  classes,
  usePagination,
  multiple,
  readOnly,
  options,
  isLoading,
  description,
  value,
  onChange,
  onInputChange,
  onChangePage,
  clearOnBlur,
  openOnFocus,
  autoHighlight,
  pagination,
  page,
  usedInTable,
  userInCard,
  disableWhileLoading,
  darkTheme,
  inputValue,
  variant,
  onClose,
  initRequest,
  initRequired,
  containerMaxHeight,
  paginationTimeout,
  template,
  defaultIcon,
  name,
  defaultLang,
  ...props
}) => {
  const controlRel = React.useRef(null);
  const [focusedByTab, setFocusedByTab] = React.useState(false);
  const [, updateState] = React.useState();
  const forceUpdate = React.useCallback(() => updateState({}), []);
  const timeout = React.useRef(null);

  React.useEffect(() => {
    if (usedInTable) forceUpdate();
  }, [forceUpdate, usedInTable]);

  const loading = !readOnly ? !options || isLoading : false;
  const disabled = readOnly || (disableWhileLoading ? loading : false);

  const chosenValue = multiple && !value ? [] : value;

  const hasNextPage = pagination
    ? pagination.count > (page || 1) * pagination.limit
    : false;

  const incrementPage = () => {
    if (isLoading || !usePagination || !hasNextPage) return;

    if (pagination?.count === options.length) {
      return;
    }

    onChangePage(page + 1);
  };

  const containerWidth =
    usedInTable && !userInCard ? 500 : controlRel?.current?.offsetWidth;

  const multiLanguage = template?.jsonSchema?.multiLanguage;
  const lang = storage?.getItem('lang')?.toUpperCase() || 'UA';

  const getLabel = (opt) => {
    if (multiLanguage) {
      const object = JSON.parse(opt?.stringified);
      return object[lang] || object[defaultLang] || '';
    } else {
      return opt?.stringified || opt?.label || opt?.name;
    }
  };

  const filterExistedFunc = (opt) =>
    !(value || [])
      .concat([])
      .map((opt) => getLabel(opt))
      .includes(getLabel(opt));

  const filteredOptions = multiple
    ? (options || []).filter(filterExistedFunc)
    : options || [];

  const customPopper = React.useMemo(
    () => (props) => {
      const concatProps = {
        ...props,
        ...(containerWidth
          ? {
              width: containerWidth,
            }
          : null),
      };

      return <Popper {...concatProps} placement="bottom-start" />;
    },
    [containerWidth],
  );

  const customListboxComponent = React.useMemo(
    () => (usePagination ? 'ul' : ListboxComponent),
    [usePagination],
  );

  const getOptionLabel = React.useCallback((opt) => `${getLabel(opt)}`, []);

  const renderTextField = React.useMemo(
    () => (params) => {
      const { inputProps, InputProps } = params;

      const { value: textFieldValue } = inputProps;

      const handleBlur = () => {
        if (initRequired) {
          initRequest();
        }
      };

      const textOverflowCheck = (value) => {
        const textWidth = getTextWidth(value, `400 16px ${getFont()}`);
        const checkTextWidth = textWidth > containerWidth - actionsWidth;
        return checkTextWidth;
      };

      const textField = (
        <TextField
          {...params}
          error={!!error}
          ref={controlRel}
          label={isMobile ? null : description}
          autoComplete="off"
          variant={variant}
          tabIndex={'-1'}
          name={name}
          onKeyUp={(e) => {
            if (e.key === 'Tab') {
              setFocusedByTab(true);
            }
          }}
          onBlur={() => {
            setFocusedByTab(false);
            handleBlur();
          }}
          inputProps={{
            ...inputProps,
            'aria-labelledby': id,
            'data-qa': props['aria-label'] || description || getOptionLabel(value) || id,
            role: 'combobox',
          }}
          InputProps={{
            ...InputProps,
            classes: {
              disabled: classes.disabled,
            },
          }}
          InputLabelProps={{
            classes: {
              root: classes.inputLabel,
            },
          }}
          className={classNames({
            [classes.darkThemeLabel]: darkTheme,
            [classes.focusVisible]: focusedByTab,
          })}
        />
      );

      return (
        <>
          {isMobile ? description : null}
          {textOverflowCheck(textFieldValue) ? (
            <CustomWidthTooltip title={textFieldValue} placement="bottom-start">
              {textField}
            </CustomWidthTooltip>
          ) : (
            textField
          )}
        </>
      );
    },
    [
      classes,
      darkTheme,
      description,
      error,
      variant,
      containerWidth,
      getOptionLabel,
      value,
      initRequired,
      initRequest,
      id,
      focusedByTab,
    ],
  );

  return (
    <Autocomplete
      id={id}
      ref={controlRel}
      inputValue={multiple ? inputValue : undefined}
      multiple={multiple}
      clearOnBlur={clearOnBlur}
      readOnly={disabled}
      openOnFocus={openOnFocus}
      loading={loading}
      autoHighlight={autoHighlight}
      PopperComponent={customPopper}
      onBlur={() => {
        setFocusedByTab(false);
      }}
      ListboxProps={{
        hasNextPage,
        isLoading,
        containerWidth,
        width: containerWidth,
        ...(usePagination
          ? {
              role: 'listbox',
              style: {
                maxHeight: containerMaxHeight,
              },
              onScroll: (event) => {
                if (!usePagination) return;

                const { currentTarget } = event;

                const bottom =
                  currentTarget.scrollHeight - currentTarget.scrollTop <=
                  currentTarget.clientHeight * 1.3;

                if (bottom) {
                  clearTimeout(timeout.current);
                  timeout.current = setTimeout(() => {
                    incrementPage();
                  }, paginationTimeout);
                }
              },
            }
          : {}),
      }}
      ListboxComponent={customListboxComponent}
      options={filteredOptions}
      loadingText={t('Loading')}
      noOptionsText={t('noOptionsText')}
      openText={t('openText')}
      clearText={t('clearText')}
      closeText={t('closeText')}
      ChipProps={{
        classes: {
          root: classes.chipRoot,
        },
      }}
      getOptionLabel={getOptionLabel}
      renderInput={(params) => renderTextField(params)}
      popupIcon={
        loading ? (
          <CircularProgress size={16} />
        ) : (
          defaultIcon ? <ArrowDropDownIcon size={16} /> : <KeyboardArrowDownIcon size={16} />
        )
      }
      onChange={(e, newValue) => onChange(newValue)}
      onInputChange={(e, newInputValue, reason) => {
        if (reason === 'input') {
          onInputChange(newInputValue);
        }
      }}
      onClose={onClose}
      classes={{
        popupIndicator: classes.popupIndicator,
        popupIndicatorOpen: classes.popupIndicatorOpen,
        clearIndicator: classes.clearIndicator,
        option: classes.option,
        root: classes.root,
      }}
      value={chosenValue}
    />
  );
};

MultiSelect.propTypes = {
  t: PropTypes.func.isRequired,
  id: PropTypes.string,
  classes: PropTypes.object.isRequired,
  onChange: PropTypes.func,
  onInputChange: PropTypes.func,
  onChangePage: PropTypes.func,
  value: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  multiple: PropTypes.bool,
  error: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]),
  isLoading: PropTypes.bool,
  options: PropTypes.array,
  readOnly: PropTypes.bool,
  inputValue: PropTypes.string,
  usePagination: PropTypes.bool,
  clearOnBlur: PropTypes.bool,
  openOnFocus: PropTypes.bool,
  autoHighlight: PropTypes.bool,
  pagination: PropTypes.object,
  disableWhileLoading: PropTypes.bool,
  darkTheme: PropTypes.bool,
  variant: PropTypes.string,
  onClose: PropTypes.func,
  initRequest: PropTypes.func,
  initRequired: PropTypes.bool,
  paginationTimeout: PropTypes.number,
  defaultLang: PropTypes.string,
};

MultiSelect.defaultProps = {
  id: '',
  onChange: () => null,
  onInputChange: () => null,
  onChangePage: () => null,
  value: null,
  multiple: false,
  error: false,
  isLoading: false,
  options: null,
  readOnly: false,
  inputValue: '',
  usePagination: false,
  clearOnBlur: true,
  openOnFocus: true,
  autoHighlight: true,
  pagination: null,
  disableWhileLoading: false,
  darkTheme: false,
  variant: 'standard',
  onClose: () => null,
  initRequest: () => null,
  initRequired: false,
  paginationTimeout: 0,
  defaultLang: '',
};

const translated = translate('TaskPage')(MultiSelect);
export default withStyles(styles)(translated);
