import React from 'react';
import { translate } from 'react-translate';
import { InputBase } from '@mui/material';
import { Theme } from '@mui/material/styles';
import withStyles from '@mui/styles/withStyles';
import classNames from 'classnames';

type AppTheme = Theme & { borderColor?: string; searchInputBg?: string; buttonBg?: string };

const styles = (theme: AppTheme) => ({
  root: {
    color: 'inherit',
    width: '100%',
    backgroundColor: theme.palette.background.default,
    borderBottom: `1px solid ${theme.borderColor}`
  },
  input: {
    color: theme.palette.text.primary,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('md')]: {
      minWidth: 200
    }
  },
  rootDark: {
    backgroundColor: theme.searchInputBg,
    borderRadius: '4px 4px 0px 0px',
    borderBottom: '2px solid transparent',
    padding: 0
  },
  inputDark: {
    color: theme.palette.text.primary,
    borderRadius: '4px 4px 0px 0px',
    padding: '14px 15px',
    borderBottom: 'none'
  },
  focusedDark: {
    borderColor: theme.buttonBg
  },
  inline: {
    display: 'inherit'
  },
  block: {
    display: 'block',
    paddingTop: 2
  }
});

const WIDTH_LIMIT = 1000;

interface SearchInputComponentProps {
  classes: Record<string, string>;
  value?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyPress?: (event: React.KeyboardEvent) => void;
  onFocus?: (event: React.FocusEvent) => void;
  onBlur?: () => void;
  startAdornment?: React.ReactNode;
  placeholder?: string;
  darkTheme?: boolean;
  autoFocus?: boolean;
  variant?: string;
}

const SearchInputComponent = ({
  classes,
  value = '',
  onChange = () => null,
  onKeyPress = () => null,
  onFocus = () => null,
  onBlur = () => null,
  startAdornment,
  placeholder,
  darkTheme,
  autoFocus = false,
  variant = 'standard'
}: SearchInputComponentProps) => {
  const [width, setWidth] = React.useState<number | boolean>(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const childRef = React.useRef<HTMLDivElement>(null);

  const childrenWidth = childRef?.current?.offsetWidth;

  React.useEffect(() => {
    if (!childRef?.current) return;

    const childrenWidth = Array.from(childRef.current.childNodes)
      .map((e) => (e as HTMLElement).offsetWidth)
      .reduce((a, b) => a + b, 0);

    if (childrenWidth === width) return;

    setWidth(childrenWidth);
  }, [setWidth, width, childRef, childrenWidth]);

  const multiline = (width as number) > WIDTH_LIMIT;

  return (
    <InputBase
      ref={rootRef}
      value={value}
      placeholder={placeholder}
      onChange={onChange}
      onKeyPress={onKeyPress}
      onFocus={onFocus}
      onBlur={onBlur}
      autoFocus={autoFocus}
      {...({ variant } as unknown as Record<string, unknown>)}
      classes={{
        root: classNames({
          [classes.root]: true,
          [classes.rootDark]: !!darkTheme,
          [classes.block]: multiline
        }),
        input: classNames({
          [classes.inputDark]: !!darkTheme
        }),
        focused: classNames({
          [classes.focusedDark]: !!darkTheme
        })
      }}
      startAdornment={
        <div
          ref={childRef}
          className={classNames({
            [classes.inline]: true,
            [classes.block]: multiline
          })}
        >
          {startAdornment}
        </div>
      }
      autoComplete="off"
    />
  );
};

const styled = withStyles(styles)(SearchInputComponent as never);
export default translate('DataTable')(styled as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
