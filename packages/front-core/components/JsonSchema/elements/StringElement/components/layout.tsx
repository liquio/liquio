/* eslint-disable react/jsx-props-no-spreading */
import { generateUUID } from 'utils/uuid';
import React from 'react';
import objectPath from 'object-path';
import {
  FormLabel,
  FormControl,
  InputAdornment,
  IconButton,
  Tooltip,
} from '@mui/material';
import withStyles, { WithStyles } from '@mui/styles/withStyles';
import { Theme } from '@mui/material/styles';
import { translate, Translate } from 'react-translate';
import TextField from '@mui/material/TextField';
import renderHTML from 'helpers/renderHTML';
import evaluate from 'helpers/evaluate';
import equilPath from 'helpers/equilPath';
import classNames from 'classnames';
import MobileDetect from 'mobile-detect';
import Masked from 'components/JsonSchema/elements/StringElement/components/mask';
import EJVError from 'components/JsonSchema/components/EJVError';
import FieldLabel from 'components/JsonSchema/components/FieldLabel';
import FormControlMessage from 'components/JsonSchema/components/FormControlMessage';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ClearIcon from '@mui/icons-material/Clear';
import {
  getTextWidth,
  getFont,
} from 'components/Select/components/ListboxComponent';

const UPPERCASE_INFLUENCE = 20;

const style = (theme: Theme) => ({
  formControl: {
    marginBottom: 40,
    maxWidth: 640,
    [theme.breakpoints.down('md')]: {
      marginBottom: 25,
      minWidth: 40,
      '&>div>label': {
        paddingRight: 20,
      },
    },
  },
  noMargin: {
    margin: 0,
  },
  menuItem: {
    [theme.breakpoints.down('md')]: {
      lineHeight: '18px',
    },
  },
  textField: {
    '& p': {
      whiteSpace: 'normal' as const,
    },
    '& label': {
      '&.MuiInputLabel-shrink': {
        maxWidth: 'calc(100% + 40px)',
        [theme.breakpoints.down('md')]: {
          maxWidth: '100%',
        },
      },
    },
    '& .MuiSelect-nativeInput': {
      display: 'none',
    }
  },
  fullDecsription: {
    '& label': {
      '&.MuiInputLabel-shrink': {
        maxWidth: 'calc(100% + 200px)',
        [theme.breakpoints.down('md')]: {
          maxWidth: (window.innerWidth - 40) * 1.35,
        },
      },
    },
  },
  formControlDisabled: {
    '& label': {
      color: 'rgba(0, 0, 0, 0.38)',
    },
  },
  startAdornment: {
    '& p': {
      whiteSpace: 'nowrap' as const,
      [theme.breakpoints.down('md')]: {
        fontSize: 13,
      },
    },
  },
  placeHolderRoot: {
    fontSize: 16,
    lineHeight: '20px',
  },
  placeHolderRootSelect: {
    paddingRight: 20,
    ...((theme as unknown as { placeHolderRootSelect?: object }).placeHolderRootSelect || {}),
  },
  select: {
    '&.MuiSelect-select': {
      paddingRight: 40,
    },
    '&:focus-visible': {
      background: 'transparent',
      outline: '3px solid #0073E6 !important'
    },
    [theme.breakpoints.down('md')]: {
      lineHeight: '22px',
      minHeight: 22,
      paddingRight: '45px !important',
    },
  },
  multiline: {
    '& label': {
      top: -5,
    },
  },
  chevronIcon: {
    transform: 'rotate(-90deg)',
    padding: 0,
    marginRight: 0,
    top: '50%',
    marginTop: -12,
  },
  darkThemeLabel: {
    '& fieldset': {
      borderColor: 'transparent',
    },
    '& legend': {
      maxWidth: 0.01,
    },
    '& label': {
      color: '#fff',
      top: 0,
      padding: 0,
      backgroundColor: 'transparent',
    },
  },
  darkThemeInput: {
    backgroundColor: '#2e2e2e',
    borderRadius: '4px 4px 0px 0px',
  },
  focusVisible: {
    '& input': {
      outline: '3px solid #0073E6 !important'
    }
  },
  darkThemeSelect: {
    backgroundColor: '#2e2e2e',
  },
  darkThemePaper: {
    background:
      'linear-gradient(0deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.12)), #121212',
    boxShadow:
      '0px 8px 10px rgba(0, 0, 0, 0.14), 0px 3px 14px rgba(0, 0, 0, 0.12), 0px 5px 5px rgba(0, 0, 0, 0.2)',
    borderRadius: 4,
    '& li': {
      color: 'rgba(255, 255, 255, 0.87)',
      paddingTop: 10,
      paddingBottom: 10,
      '&:hover': {
        background: 'rgba(255, 255, 255, 0.12)',
      },
    },
  },
  darkThemeChevronIcon: {
    fill: 'rgba(255, 255, 255, 0.7)',
  },
  clearIcon: {
    position: 'absolute' as const,
    right: 25,
    padding: 2,
    '& svg': {
      fontSize: 20,
      fill: 'rgba(0, 0, 0, 0.54)',
    },
    '&:focus-visible': {
      outline: '3px solid #0073E6'
    }
  },
  darkThemeClearIcon: {
    '& svg': {
      fontSize: 20,
      fill: 'rgba(255, 255, 255, 0.7)',
    },
  },
  formLabel: {
    fontSize: 13,
    opacity: 1,
  },
  withIndex: {
    [theme.breakpoints.down('md')]: {
      marginBottom: 35,
    },
    [theme.breakpoints.down('sm')]: {
      marginBottom: 35,
    },
  },
  helperText: {
    fontSize: 13,
    '&:focus-visible': {
      outline: '3px solid #0073E6',
      display: 'inline-block',
      width: '100%'
    }
  }
});

interface LayoutProps extends WithStyles<typeof style> {
  t: Translate;
  onChange: (event: unknown) => void;
  children?: React.ReactNode;
  select?: boolean;
  sample?: string | boolean;
  error?: { message?: string } | null;
  formControlProps?: Record<string, unknown>;
  description?: string;
  readOnly?: boolean;
  InputProps?: Record<string, unknown>;
  SelectProps?: Record<string, unknown>;
  mask: string;
  required?: boolean;
  value?: string | number;
  helperText?: string;
  path: Array<string | number>;
  useTrim?: boolean;
  changeCase?: string | null;
  wrapperClass?: string | null;
  notRequiredLabel?: string | null;
  inlineDisplay?: boolean;
  darkTheme?: boolean;
  width?: string | null;
  widthMobile?: string | null;
  deleteIcon?: boolean;
  variant?: string;
  chipsValue?: React.ReactNode;
  renderOneLine?: boolean;
  schema?: { autocomplete?: string; sample?: string };
  options?: Array<string | { id: unknown; name?: string; stringified?: string }> | null;
  multiline?: boolean;
  startAdornment?: string | React.ReactElement<{ className?: string; children?: React.ReactNode }>;
  endAdornment?: string | React.ReactElement<{ className?: string; children?: React.ReactNode }>;
  rootDocument?: { data: Record<string, unknown> };
  maxLength?: number;
  maxWidth?: number | string;
  hidden?: boolean;
  formatChars?: Record<string, string>;
  renderChildren: () => React.ReactNode;
  handleChange: (event: unknown) => void;
  onFocus?: (event: React.FocusEvent) => void;
  onBlur?: (event: React.FocusEvent) => void | Promise<void>;
  noMargin?: boolean;
  onInput?: string;
  className?: string;
  changeOnBlur?: boolean;
  externalReaderMessage?: React.ReactNode;
  triggerExternalPath?: unknown;
  stepName?: string;
  messageList?: unknown[];
  ariaLabel?: string;
  originDocument?: { data: Record<string, unknown> };
  isFormGroup?: boolean;
  [key: string]: unknown;
}

const Layout = ({
  t,
  classes,
  sample,
  schema,
  error,
  description,
  formControlProps = {},
  readOnly = false,
  InputProps = {},
  mask,
  required = false,
  path = [],
  select = false,
  options = null,
  helperText = '',
  multiline = false,
  startAdornment,
  endAdornment,
  value = '',
  rootDocument,
  maxLength,
  width = null,
  widthMobile = null,
  maxWidth,
  hidden,
  formatChars,
  handleChange,
  renderChildren,
  useTrim = false,
  onFocus,
  onBlur,
  noMargin,
  onInput,
  className,
  changeOnBlur = false,
  wrapperClass = null,
  externalReaderMessage,
  triggerExternalPath,
  stepName,
  notRequiredLabel = null,
  messageList: [message] = [],
  inlineDisplay = false,
  darkTheme = false,
  deleteIcon = true,
  variant = 'standard',
  chipsValue = null,
  ariaLabel: ariaLabelProp,
  originDocument,
  isFormGroup,
  renderOneLine = false,
  ...rest
}: LayoutProps) => {
  const [focusedByTab, setFocusedByTab] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(value || '');
  const [ariaClearHint, setAriaClearHint] = React.useState('');
  const [randomLabelId] = React.useState(generateUUID());
  const [wrapperId] = React.useState(`${randomLabelId}-${path.join('-')}`);
  let [timeout] = React.useState<ReturnType<typeof setTimeout> | null>(null);
  const md = new MobileDetect(window.navigator.userAgent);
  const isMobile = !!md.mobile();
  const ref = React.useRef<HTMLDivElement>(null);
  const autoComplete = schema?.autocomplete;

  React.useEffect(() => {
    if (!!error && !value) {
      setAriaClearHint(error?.message || '');
    } else if (select || (options && options.length > 0)) {
      setAriaClearHint(t('VoiceOverText'));
    } else {
      setAriaClearHint('');
    }
  }, [error, value, select, options]);

  const checkPristine = React.useCallback(() => {
    if (!changeOnBlur) return false;
    const origin = objectPath.get(
      originDocument?.data,
      ([stepName] as Array<string | number>).concat(path),
    );
    return (inputValue || '') === (origin || '');
  }, [inputValue, originDocument, path, stepName, changeOnBlur]);

  React.useEffect(() => {
    setInputValue(value);
    if (multiline) {
      const textField = ref.current;
      const textarea = textField?.querySelector('textarea:last-of-type');
      if (textField && textarea) {
        const hasAriaLabelledBy = textarea.hasAttribute('aria-labelledby');
        if (!hasAriaLabelledBy) {
          textarea.setAttribute('aria-labelledby', wrapperId);
        }
      }
    }
  }, [value]);

  const onMouseOver = () => {
    if (timeout) clearTimeout(timeout);
    setHovered(true);
  };

  const onMouseOut = () => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => setHovered(false), 100);
  };

  const InputPropsOptions: Record<string, unknown> = {
    ...InputProps,
    classes: {
      root: classNames({
        [classes.darkThemeInput]: darkTheme,
      }),
      input: classNames({
        [classes.darkThemeInput]: darkTheme,
      }),
    },
  };

  if (!multiline && mask.length) {
    InputPropsOptions.inputComponent = Masked;
  }

  if (startAdornment) {
    if (typeof startAdornment === 'string') {
      InputPropsOptions.startAdornment = (
        <InputAdornment className={(classes as unknown as { adornment?: string }).adornment} position="start">
          {startAdornment}
        </InputAdornment>
      );
    } else {
      InputPropsOptions.startAdornment = (
        <InputAdornment
          {...startAdornment.props}
          className={classNames(
            classes.startAdornment,
            startAdornment?.props?.className,
          )}
          position="start"
        >
          {startAdornment?.props?.children
            ? startAdornment?.props?.children
            : null}
        </InputAdornment>
      );
    }
  }

  if (endAdornment) {
    if (typeof endAdornment === 'string') {
      InputPropsOptions.endAdornment = (
        <InputAdornment position="end">{endAdornment}</InputAdornment>
      );
    } else {
      InputPropsOptions.endAdornment = (
        <InputAdornment
          {...endAdornment.props}
          className={classNames(endAdornment?.props?.className)}
          position="end"
        >
          {endAdornment?.props?.children ? endAdornment?.props?.children : null}
        </InputAdornment>
      );
    }
  }

  if (message) {
    InputPropsOptions.endAdornment = (
      <FormControlMessage message={message as never}>
        {InputPropsOptions.endAdornment as React.ReactNode}
      </FormControlMessage>
    );
  }

  const sampleElement =
    (helperText || sample || (schema && schema.sample)) &&
    renderHTML((helperText || sample || (schema && schema.sample)) as string);
  const errorText = error && <EJVError error={error as never} />;

  const formWidth = isMobile && widthMobile ? widthMobile : width;

  if (hidden) return null;

  const setAriaDescribedBy = () => {
    if (ariaClearHint) return ariaClearHint ? `${wrapperId}-clear-hint` : undefined;
    if (!ariaClearHint && !!error) return wrapperId ? `${wrapperId}-error` : undefined;
  };

  const getChildSize = () => {
    const itemWidth = (ref?.current?.offsetWidth as number) - UPPERCASE_INFLUENCE;
    const textWidth = getTextWidth(inputValue, `400 16px ${getFont()}`);
    const checkTextWidth = textWidth > itemWidth;
    return checkTextWidth;
  };

  const textOverflowCheck = getChildSize();

  const renderTextField = () => {
    const ariaLabel = ariaLabelProp || description || value;

    return (
      <>
        {isMobile ? (
          <FormLabel
            component="legend"
            classes={{
              root: classes.formLabel,
            }}
          >
            <FieldLabel
              description={description}
              required={required}
              notRequiredLabel={notRequiredLabel as string}
              rootDocument={rootDocument}
              value={value}
              renderOneLine={renderOneLine}
              {...rest}
            />
          </FormLabel>
        ) : null}
        {isMobile ? chipsValue : null}
        <TextField
          {...rest}
          variant={variant as never}
          ref={ref}
          className={classNames(
            {
              [classes.textField]: true,
              [classes.formControlDisabled]: readOnly,
              [classes.fullDecsription]: !inlineDisplay,
              [classes.multiline]: multiline && (focused || !!value),
              [classes.focusVisible]: focusedByTab,
            },
            wrapperClass as string,
          )}
          sx={{
            '& .MuiInputBase-input.Mui-focused': {
              outline: '3px solid #0073E6',
              outlineOffset: '2px',
            }
          }}
          select={select || !!options}
          label={
            description && !isMobile ? (
              <FieldLabel
                description={description}
                required={required}
                notRequiredLabel={notRequiredLabel as string}
                rootDocument={rootDocument}
                value={value}
                renderOneLine={renderOneLine}
                {...rest}
              />
            ) : null
          }
          onChange={(e) => {
            setInputValue(e.target.value);

            if (mask && !!error) {
              return;
            }

            if (!changeOnBlur) {
              handleChange(e);
            }
          }}
          disabled={readOnly}
          helperText={
            sampleElement && errorText ? (
              <span
                className={classNames(classes.helperText)}
                id={`${wrapperId}-error`}
              >
                {errorText}
              </span>
            ) : sampleElement ? (
              <span
                className={classNames(classes.helperText)}
                id={`${wrapperId}-error`}
                tabIndex={0}
              >
                {sampleElement}
              </span>
            ) : errorText ? (
              <span
                className={classNames(classes.helperText)}
                id={`${wrapperId}-error`}
              >
                {errorText}
              </span>
            ) : null
          }
          name={path.join('-')}
          error={!!error}
          multiline={multiline}
          InputProps={InputPropsOptions}
          inputProps={{
            maxLength,
            mask,
            formatChars,
            autoComplete,
            ...(!multiline
              ? { style: { height: 'auto', textOverflow: 'ellipsis' as const } }
              : {}),
            'aria-describedby': setAriaDescribedBy(),
            'aria-labelledby': description && !isMobile ? `${wrapperId}-label` : undefined,
            'data-qa': ariaLabel
          } as never}
          InputLabelProps={{
            shrink: !!value || focused || !!startAdornment,
            ...(select || !!options ? { htmlFor: randomLabelId } : {}),
            classes: {
              root: classNames({
                [classes.placeHolderRoot]: true,
                [classes.placeHolderRootSelect]: !!options || !!endAdornment,
              }),
            },
          }}
          SelectProps={{
            classes: {
              select: classNames({
                [classes.select]: true,
                [classes.darkThemeSelect]: darkTheme,
              }),
            },
            inputProps: {
              id: randomLabelId,
              title: description,
              'aria-labelledby': wrapperId,
              autoComplete,
            },
            MenuProps: {
              MenuListProps: {
                style: {
                  maxWidth: '640px',
                  maxHeight: '400px',
                  overflowY: 'auto' as const,
                  padding: '2px',
                },
                'aria-labelledby': wrapperId,
              },
              classes: {
                paper: classNames({
                  [classes.darkThemePaper]: darkTheme,
                }),
              },
            },
            IconComponent: (props: Record<string, unknown>) => (
              <>
                {value && deleteIcon && (hovered || isMobile) && !readOnly ? (
                  <IconButton
                    className={classNames({
                      [classes.clearIcon]: true,
                      [classes.darkThemeClearIcon]: darkTheme,
                    })}
                    onClick={() => {
                      setInputValue('');
                      handleChange({ target: { value: '' } });
                    }}
                    aria-label={t('Clear')}
                    tabIndex={-1}
                  >
                    <ClearIcon />
                  </IconButton>
                ) : null}
                <IconButton
                  {...props}
                  classes={{
                    root: classes.chevronIcon,
                  }}
                  aria-label={t('Select')}
                  disabled={readOnly}
                  tabIndex={-1}
                >
                  <ChevronLeftIcon
                    {...({ alt: t('Select') } as Record<string, unknown>)}
                    className={classNames({
                      [classes.darkThemeChevronIcon]: darkTheme,
                    })}
                  />
                </IconButton>
              </>
            ),
          } as never}
          id={(select || !!options) ? path.join('-') : wrapperId}
          value={inputValue}
          onFocus={(event) => {
            setFocused(true);
            onFocus && onFocus(event);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Tab' && (e.target as HTMLElement).tagName === 'INPUT') {
              setFocusedByTab(true);
            }
            if (e.key === 'Tab' && !(e as unknown as { key: boolean }).key) {
              e.preventDefault();

              const focusable = Array.from(
                document.querySelectorAll<HTMLElement>(
                  'button, [href], input, select, label, textarea, [tabindex]'
                )
              ).filter(el =>
                !(el as unknown as { disabled?: boolean }).disabled &&
                el.offsetParent !== null &&
                el.tabIndex !== -1
              );

              const currentIndex = focusable.indexOf(e.target as HTMLElement);
              const next = focusable[currentIndex + 1];
              next?.focus();
            }
            if ((e.key === 'Backspace' || e.key === 'Delete') && (select || !!options) && value) {
              setInputValue('');
              handleChange({ target: { value: '' } });
            }
          }}
          onKeyUp={(e) => {
            if (e.key === 'Tab' && (e.target as HTMLElement).tagName === 'INPUT') {
              setFocusedByTab(true);
            }
          }}
          onBlur={async (event) => {
            const { target } = event;

            if (mask || changeOnBlur || useTrim) {
              const pristine = checkPristine();

              if (pristine) return;

              await handleChange({
                target: {
                  ...target,
                  value: useTrim ? (inputValue as string).trim() : inputValue,
                },
              });
            }
            setFocused(false);
            setFocusedByTab(false);
            onBlur && onBlur(event);
          }}
          onInput={(e) => {
            if (onInput) {
              try {
                const target = e.target as HTMLInputElement;
                const { selectionStart } = target;
                const oldLength = target.value.length;
                target.value = evaluate(onInput, target.value) as string;
                const newLength = target.value.length;

                const cursorPosition = (selectionStart as number) + (newLength - oldLength);

                target.selectionStart = cursorPosition;
                target.selectionEnd = cursorPosition;
              } catch {
                // Nothing to do
              }
            }
          }}
        >
          {renderChildren()}
        </TextField>
        {ariaClearHint && (
          <span
            id={`${wrapperId}-clear-hint`}
            style={{
              position: 'absolute',
              width: 1,
              height: 1,
              margin: -1,
              border: 0,
              padding: 0,
              overflow: 'hidden',
              clip: 'rect(0 0 0 0)',
              clipPath: 'inset(50%)',
              whiteSpace: 'nowrap',
            }}
            aria-live="polite"
          >
            {ariaClearHint}
          </span>
        )}
      </>
    );
  };

  return (
    <FormControl
      variant="standard"
      fullWidth={true}
      {...formControlProps}
      className={classNames(className && className, {
        [classes.formControl]: true,
        [classes.noMargin]: !!noMargin,
        [classes.darkThemeLabel]: darkTheme,
        [classes.withIndex]: !!isFormGroup && !noMargin,
      })}
      style={{ width: formWidth as string, maxWidth }}
      onMouseOver={onMouseOver}
      onMouseOut={onMouseOut}
    >
      {textOverflowCheck && !focused && !multiline ? (
        <Tooltip
          title={inputValue}
          placement="bottom-start"
          aria-label={(description || value) as string}
        >
          {renderTextField()}
        </Tooltip>
      ) : (
        renderTextField()
      )}

      {equilPath(triggerExternalPath as unknown[], ([stepName] as Array<string | number>).concat(path))
        ? externalReaderMessage
        : null}
    </FormControl>
  );
};

const styled = withStyles(style)(Layout);
export default translate('JsonSchemaEditor')(styled);
