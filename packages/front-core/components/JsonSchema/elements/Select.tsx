import React from 'react';
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
import withStyles, { WithStyles } from '@mui/styles/withStyles';
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

interface SelectOption {
  id: unknown;
  name?: string;
  stringified?: string;
}

interface SelectComponentProps extends WithStyles<typeof styles> {
  t: (key: string) => string;
  path?: Array<string | number>;
  description?: string;
  value?: string | number | null;
  onChange?: (value: unknown) => void;
  options?: SelectOption[];
  autoFocus?: boolean;
  hidden?: boolean;
  width?: number | string;
  readOnly?: boolean;
  darkTheme?: boolean;
  variant?: 'standard' | 'outlined' | 'filled';
  allowDelete?: boolean;
  placeholder?: string;
}

const SelectComponent = ({
  t,
  classes,
  path = [],
  description,
  value = null,
  onChange = () => null,
  options = [],
  autoFocus,
  hidden,
  width,
  readOnly,
  darkTheme = false,
  variant = 'standard',
  allowDelete = true,
  placeholder = '',
}: SelectComponentProps) => {
  if (hidden) return null;

  const IconComponent = darkTheme
    ? {
        IconComponent: (props: Record<string, unknown>) => (
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
        } as Record<string, string>}
        {...IconComponent}
      >
        {value && allowDelete ? (
          <MenuItem value={null as unknown as string}>
            <ClearIcon />
            {t('Clear')}
          </MenuItem>
        ) : null}

        {value && allowDelete ? <Divider light={true} component="li" /> : null}

        {!options || !options.length ? (
          <MenuItem value={null as unknown as string}>{t('EmptyData')}</MenuItem>
        ) : null}

        {options.map(({ id, name, stringified }) => (
          <MenuItem key={id as React.Key} value={id as string}>
            {stringified || name || (id as string)}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

const styled = withStyles(styles)(SelectComponent as never);
export default translate('Elements')(styled as never) as unknown as React.ComponentType<Record<string, unknown>>;
