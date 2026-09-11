/* eslint-disable react/jsx-no-duplicate-props */
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
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
import {
  getCurrentLanguageCode,
  getTranslationCandidates,
} from 'helpers/localization';

const md = new MobileDetect(window.navigator.userAgent);
const isMobile = !!md.mobile();
const actionsWidth = 52;

const AutocompleteAny = Autocomplete as unknown as React.ComponentType<Record<string, unknown>>;
const PopperAny = Popper as unknown as React.ComponentType<Record<string, unknown>>;

interface OptionLike {
  stringified?: string;
  label?: string;
  name?: string;
  [key: string]: unknown;
}

type OptionValue = OptionLike | string | null | undefined;

interface Pagination {
  count: number;
  limit: number;
}

interface MultiSelectProps {
  t: (key: string) => string;
  id?: string;
  error?: boolean | Record<string, unknown>;
  classes: Record<string, string>;
  usePagination?: boolean;
  multiple?: boolean;
  readOnly?: boolean;
  options?: OptionValue[] | null;
  isLoading?: boolean;
  description?: React.ReactNode;
  value?: OptionValue | OptionValue[];
  onChange?: (value: unknown) => void;
  onInputChange?: (value: string) => void;
  onChangePage?: (page: number) => void;
  clearOnBlur?: boolean;
  openOnFocus?: boolean;
  autoHighlight?: boolean;
  pagination?: Pagination | null;
  page?: number;
  usedInTable?: boolean;
  userInCard?: boolean;
  disableWhileLoading?: boolean;
  darkTheme?: boolean;
  inputValue?: string;
  variant?: 'standard' | 'outlined' | 'filled';
  onClose?: () => void;
  initRequest?: () => void;
  initRequired?: boolean;
  containerMaxHeight?: number;
  paginationTimeout?: number;
  template?: { jsonSchema?: { multiLanguage?: boolean } };
  defaultIcon?: boolean;
  name?: string;
  defaultLang?: string;
  [key: string]: unknown;
}

const MultiSelect = ({
  t,
  id = '',
  error = false,
  classes,
  usePagination = false,
  multiple = false,
  readOnly = false,
  options = null,
  isLoading = false,
  description,
  value = null,
  onChange = () => null,
  onInputChange = () => null,
  onChangePage = () => null,
  clearOnBlur = true,
  openOnFocus = true,
  autoHighlight = true,
  pagination = null,
  page,
  usedInTable,
  userInCard,
  disableWhileLoading = false,
  darkTheme = false,
  inputValue = '',
  variant = 'standard',
  onClose = () => null,
  initRequest = () => null,
  initRequired = false,
  containerMaxHeight,
  paginationTimeout = 0,
  template,
  defaultIcon,
  name,
  defaultLang = '',
  ...props
}: MultiSelectProps) => {
  const controlRel = React.useRef<HTMLElement | null>(null);
  const [focusedByTab, setFocusedByTab] = React.useState(false);
  const [, updateState] = React.useState<Record<string, never>>();
  const forceUpdate = React.useCallback(() => updateState({}), []);
  const timeout = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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

    if (pagination?.count === (options as OptionValue[]).length) {
      return;
    }

    onChangePage((page as number) + 1);
  };

  const containerWidth =
    usedInTable && !userInCard ? 500 : controlRel?.current?.offsetWidth;

  const multiLanguage = template?.jsonSchema?.multiLanguage;
  const languageCandidates = getTranslationCandidates(
    getCurrentLanguageCode({ fallbackLanguage: 'uk' }),
  ).map((candidate) => candidate.toUpperCase());

  const getLabel = (opt: OptionValue): React.ReactNode => {
    const optRecord = opt as OptionLike | null | undefined;
    if (multiLanguage) {
      if (typeof optRecord?.stringified === 'string' && optRecord?.stringified?.startsWith('{')) {
        const object = JSON.parse(optRecord?.stringified as string) as Record<string, string>;
        return (
          languageCandidates.map((candidate) => object[candidate]).find(Boolean) ||
          object[defaultLang] ||
          ''
        );
      }
      return optRecord?.stringified || optRecord?.label || optRecord?.name;
    } else {
      return optRecord?.stringified || optRecord?.label || optRecord?.name;
    }
  };

  const filterExistedFunc = (opt: OptionValue) =>
    !((value as OptionValue[]) || [])
      .concat([])
      .map((opt) => getLabel(opt))
      .includes(getLabel(opt));

  const filteredOptions = multiple
    ? ((options as OptionValue[]) || []).filter(filterExistedFunc)
    : options || [];

  const customPopper = React.useMemo(
    () => (popperProps: Record<string, unknown>) => {
      const concatProps = {
        ...popperProps,
        ...(containerWidth
          ? {
              width: containerWidth,
            }
          : null),
      };

      return <PopperAny {...concatProps} placement="bottom-start" />;
    },
    [containerWidth],
  );

  const customListboxComponent = React.useMemo(
    () => (usePagination ? 'ul' : ListboxComponent),
    [usePagination],
  );

  const getOptionLabel = React.useCallback((opt: OptionValue) => `${getLabel(opt)}`, []);

  const renderTextField = React.useMemo(
    () => (params: Record<string, unknown>) => {
      const { inputProps, InputProps } = params as {
        inputProps: Record<string, unknown>;
        InputProps: Record<string, unknown>;
      };

      const { value: textFieldValue } = inputProps as { value: string };

      const handleBlur = () => {
        if (initRequired) {
          initRequest();
        }
      };

      const textOverflowCheck = (value: string) => {
        const textWidth = getTextWidth(value, `400 16px ${getFont()}`);
        const checkTextWidth = textWidth > (containerWidth as number) - actionsWidth;
        return checkTextWidth;
      };

      const textField = (
        <TextField
          {...(params as Record<string, unknown>)}
          error={!!error}
          ref={controlRel as unknown as React.RefObject<HTMLDivElement>}
          label={isMobile ? null : description}
          autoComplete="off"
          variant={variant}
          {...({ tabIndex: '-1' } as unknown as Record<string, unknown>)}
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
            'data-qa': props['aria-label'] || description || getOptionLabel(value as OptionValue) || id,
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
    <AutocompleteAny
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
              onScroll: (event: React.UIEvent) => {
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
      renderInput={(params: Record<string, unknown>) => renderTextField(params)}
      popupIcon={
        loading ? (
          <CircularProgress size={16} />
        ) : defaultIcon ? (
          <ArrowDropDownIcon {...({ size: 16 } as unknown as Record<string, unknown>)} />
        ) : (
          <KeyboardArrowDownIcon {...({ size: 16 } as unknown as Record<string, unknown>)} />
        )
      }
      onChange={(e: unknown, newValue: unknown) => onChange!(newValue)}
      onInputChange={(e: unknown, newInputValue: string, reason: string) => {
        if (reason === 'input') {
          onInputChange!(newInputValue);
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

const translated = translate('TaskPage')(MultiSelect as never);
export default withStyles(styles)(translated as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
