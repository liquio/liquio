import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { InputBase } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import classNames from 'classnames';

const styles = (theme) => ({
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

const SearchInputComponent = ({
  classes,
  value,
  onChange,
  onKeyPress,
  onFocus,
  onBlur,
  startAdornment,
  placeholder,
  darkTheme,
  autoFocus,
  variant
}) => {
  const [width, setWidth] = React.useState(false);
  const rootRef = React.useRef(null);
  const childRef = React.useRef(null);

  const childrenWidth = childRef?.current?.offsetWidth;

  React.useEffect(() => {
    if (!childRef?.current) return;

    const childrenWidth = Array.from(childRef.current.childNodes)
      .map((e) => e.offsetWidth)
      .reduce((a, b) => a + b, 0);

    if (childrenWidth === width) return;

    setWidth(childrenWidth);
  }, [setWidth, width, childRef, childrenWidth]);

  const multiline = width > WIDTH_LIMIT;

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
      variant={variant}
      classes={{
        root: classNames({
          [classes.root]: true,
          [classes.rootDark]: darkTheme,
          [classes.block]: multiline
        }),
        input: classNames({
          [classes.inputDark]: darkTheme
        }),
        focused: classNames({
          [classes.focusedDark]: darkTheme
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

SearchInputComponent.propTypes = {
  t: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func,
  onKeyPress: PropTypes.func,
  onFocus: PropTypes.func,
  onBlur: PropTypes.func,
  autoFocus: PropTypes.bool,
  variant: PropTypes.string
};

SearchInputComponent.defaultProps = {
  value: '',
  onChange: () => null,
  onKeyPress: () => null,
  onBlur: () => null,
  onFocus: () => null,
  autoFocus: false,
  variant: 'standard'
};

const styled = withStyles(styles)(SearchInputComponent);
export default translate('DataTable')(styled);
