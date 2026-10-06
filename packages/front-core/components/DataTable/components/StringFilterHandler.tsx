import React from 'react';
import { translate } from 'react-translate';
import classNames from 'classnames';
import { TextField, Paper, IconButton, InputAdornment, Checkbox } from '@mui/material';
import { Theme } from '@mui/material/styles';
import withStyles from '@mui/styles/withStyles';
import InputIcon from '@mui/icons-material/Input';
import TextFormatIcon from '@mui/icons-material/TextFormat';

import FilterHandler, { type FilterHandlerProps } from 'components/DataTable/components/FilterHandler';

type AppTheme = Theme & { listBackground?: Record<string, unknown> };

const styles = (theme: AppTheme) => ({
  root: {
    display: 'flex',
    padding: 8
  },
  darkThemeRoot: {
    padding: 17,
    ...(theme.listBackground || {})
  },
  darkThemeLabel: {
    width: '100%',
    '& label': {
      color: '#fff'
    },
    '& input': {
      color: '#fff'
    }
  },
  withCheckBox: {
    display: 'block',
    alignItems: 'center'
  },
  checkboxContainer: {
    marginTop: 15
  }
});

interface StringFilterHandlerState {
  value: string;
  searchRegex: boolean;
}

class StringFilterHandler extends FilterHandler {
  static defaultProps: Partial<FilterHandlerProps> = {
    ...FilterHandler.defaultProps,
    name: '',
    value: '',
    type: null,
    filterValue: null,
    onChange: () => null,
    chipLabel: null,
    replaceSpaces: false
  };

  constructor(props: FilterHandlerProps) {
    super(props);

    this.state = {
      value: props.value as string,
      searchRegex: this.loadSearchRegex()
    };
  }

  loadSearchRegex() {
    return localStorage.getItem('searchRegex') === 'true' || false;
  }

  renderIcon = () => {
    const { IconComponent } = this.props;

    if (IconComponent) {
      return <IconComponent />;
    }

    return <TextFormatIcon />;
  };

  renderChip = () => {
    const { name, value, chipLabel } = this.props;

    return [chipLabel || name, value].join(': ');
  };

  replaceSpaces = (string: string) => (string || '').replace(/ "/g, '"').replace(/": /g, '"');

  handleChangeWrapper = (value: string) => {
    const { replaceSpaces, onChange } = this.props;
    const checkValue = replaceSpaces ? this.replaceSpaces(value) : value;
    const regex_as_string = (this.state as unknown as StringFilterHandlerState).searchRegex;
    onChange?.(checkValue, regex_as_string);
  };

  componentDidMount = () => {
    const { filterValue, onChange, value } = this.props;
    if (!value) {
      localStorage.setItem('searchRegex', 'false');
    }
    filterValue && onChange?.(filterValue);
  };

  handleChangeSearchCheckbox = () => {
    this.setState((prevState) => {
      const newSearchRegex = !(prevState as unknown as StringFilterHandlerState).searchRegex;
      localStorage.setItem('searchRegex', String(newSearchRegex));
      return { searchRegex: newSearchRegex };
    });
  };

  renderHandler = () => {
    const { classes, type, darkTheme, variant, name, t } = this.props as FilterHandlerProps & {
      classes: Record<string, string>;
    };
    const { value, searchRegex } = this.state as unknown as StringFilterHandlerState;
    const showCheckBox = name === 'Код процесу';

    const InputProps = {
      endAdornment: (
        <InputAdornment position="end">
          <IconButton onClick={() => this.handleChangeWrapper(value)} size="large">
            <InputIcon
              className={classNames({
                [classes.fillIcon]: !!darkTheme
              })}
            />
          </IconButton>
        </InputAdornment>
      )
    };

    return (
      <Paper
        elevation={0}
        className={classNames({
          [classes.root]: true,
          [classes.darkThemeRoot]: !!darkTheme,
          [classes.withCheckBox]: showCheckBox
        })}
      >
        <TextField
          autoFocus={true}
          value={value}
          onChange={({ target: { value: newValue } }) => this.setState({ value: newValue })}
          onKeyPress={({ key }: React.KeyboardEvent) => key === 'Enter' && this.handleChangeWrapper(value)}
          type={type as string}
          className={classNames({
            [classes.darkThemeLabel]: !!darkTheme
          })}
          variant={variant as never}
          InputProps={!darkTheme ? InputProps : undefined}
        />
        {showCheckBox ? (
          <div className={classes.checkboxContainer}>
            <Checkbox
              checked={searchRegex}
              onChange={this.handleChangeSearchCheckbox}
              inputProps={{ 'aria-label': t?.('SearchRegular') }}
            />
            <span>{t?.('SearchRegular')}</span>
          </div>
        ) : null}
      </Paper>
    );
  };
}

const styled = withStyles(styles)(StringFilterHandler as never);
export default translate('StringFilterHandler')(styled as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
