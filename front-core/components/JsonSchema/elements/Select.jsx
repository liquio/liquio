import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import classNames from 'classnames';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  IconButton,
} from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import ClearIcon from '@mui/icons-material/Clear';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';

const styles = {
  formControl: {
    padding: '0 0 10px',
  },
  darkThemeLabel: {
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
    padding: 0,
    '& fieldset': {
      borderColor: 'transparent',
    },
  },
  darkThemeSelect: {},
  chevronIcon: {
    transform: 'rotate(-90deg)',
    padding: 0,
    marginRight: 0,
    '& svg': {
      fill: 'rgba(255, 255, 255, 0.7)',
    },
  },
  darkThemeSelectRoot: {
    '&::before': {
      display: 'none',
    },
  },
};

const SelectComponent = ({
  t,
  classes,
  path,
  description,
  value,
  onChange,
  options,
  autoFocus,
  hidden,
  width,
  readOnly,
  darkTheme,
  variant,
  allowDelete,
  placeholder,
}) => {
  if (hidden) return null;

  const IconComponent = darkTheme
    ? {
        IconComponent: (props) => (
          <IconButton
            {...props}
            classes={{
              root: classes.chevronIcon,
            }}
            disabled={readOnly}
            size="large"
          >
            <ChevronLeftIcon />
          </IconButton>
        ),
      }
    : {};

  return (
    <FormControl
      fullWidth={true}
      className={classNames({
        [classes.formControl]: true,
        [classes.darkThemeLabel]: darkTheme,
      })}
      style={{ width }}
      variant={variant}
    >
      {description ? (
        <InputLabel htmlFor={path.join('-')}>{description}</InputLabel>
      ) : null}

      <Select
        aria-label={description}
        variant={variant}
        autoFocus={autoFocus}
        disabled={readOnly}
        value={value || placeholder}
        onChange={({ target: { value: newValue } }) =>
          onChange && onChange(newValue)
        }
        inputProps={{
          id: path.join('-'),
        }}
        classes={{
          select: classNames({
            [classes.darkThemeSelect]: darkTheme,
          }),
          root: classes.darkThemeSelectRoot,
        }}
        {...IconComponent}
      >
        {value && allowDelete ? (
          <MenuItem value={null}>
            <ClearIcon />
            {t('Clear')}
          </MenuItem>
        ) : null}

        {value && allowDelete ? <Divider light={true} component="li" /> : null}

        {!options || !options.length ? (
          <MenuItem value={null}>{t('EmptyData')}</MenuItem>
        ) : null}

        {options.map(({ id, name, stringified }) => (
          <MenuItem key={id} value={id}>
            {stringified || name || id}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

SelectComponent.propTypes = {
  path: PropTypes.array,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  options: PropTypes.array,
  darkTheme: PropTypes.bool,
  variant: PropTypes.string,
  allowDelete: PropTypes.bool,
  placeholder: PropTypes.string,
};

SelectComponent.defaultProps = {
  path: [],
  value: null,
  onChange: () => null,
  options: [],
  darkTheme: false,
  variant: 'standard',
  allowDelete: true,
  placeholder: '',
};

const styled = withStyles(styles)(SelectComponent);
export default translate('Elements')(styled);
