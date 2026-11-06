import React from 'react';
import { translate } from 'react-translate';
import classNames from 'classnames';
import { Checkbox, Paper, TextField } from '@mui/material';
import { Theme } from '@mui/material/styles';
import withStyles from '@mui/styles/withStyles';
import TextFormatIcon from '@mui/icons-material/TextFormat';

import FilterHandler, { type FilterHandlerProps } from 'components/DataTable/components/FilterHandler';

type AppTheme = Theme & { listBackground?: Record<string, unknown> };

const styles = (theme: AppTheme) => ({
  root: {
    padding: 8
  },
  tagsList: {
    maxHeight: 325,
    overflow: 'auto'
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

  search: {
    '& .MuiInputBase-root': {
      borderRadius: '4px 4px 0px 0px',
      backgroundColor: '#2e2e2e'
    },
    '& :before': {
      borderBottom: 'none'
    },
    '& .MuiInputBase-input': {
      padding: '16px 14px',
      fontSize: '14px'
    }
  },

  searchWrap: {
    marginBottom: 16
  },

  checkboxContainer: {
    marginTop: 15
  }
});

interface MultiSelectFilterHandlerState {
  selectedValues: string[];
  searchValue: string;
}

class MultiSelectFilterHandler extends FilterHandler {
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
      selectedValues: [],
      searchValue: ''
    };
  }

  renderIcon = () => {
    const { IconComponent } = this.props;

    if (IconComponent) {
      return <IconComponent />;
    }

    return <TextFormatIcon />;
  };

  renderChip = () => {
    const { name, value, options, chipLabel } = this.props as FilterHandlerProps & {
      value?: { id?: unknown; name?: string } | string;
    };
    let valueId: unknown = value;
    if (typeof value === 'object') {
      valueId = (value as { id?: unknown })?.id;
    }
    const currentChip = (options || []).find((opt) => opt.id == valueId);
    const chipName = currentChip?.name || (value as { name?: string })?.name;
    return [chipLabel || name, chipName].join(': ');
  };

  handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { onChange } = this.props;
    const { checked, value } = event.target;
    const { selectedValues } = this.state as unknown as MultiSelectFilterHandlerState;
    let selected = selectedValues;
    if (checked) {
      selected = [...selectedValues, value];
    } else {
      selected = selectedValues.filter((val) => val !== value);
    }
    this.setState({
      selectedValues: selected
    });

    onChange?.(selected);
  };

  componentDidMount = () => {
    const { filterValue, value, onChange } = this.props;
    if (value && Array.isArray(value)) {
      this.setState({ selectedValues: value.map((id) => id.toString()) });
    }
    filterValue && onChange?.(filterValue);
  };

  renderHandler = () => {
    const { classes, darkTheme, options, placeholder } = this.props as FilterHandlerProps & {
      classes: Record<string, string>;
    };
    const { selectedValues, searchValue } = this.state as unknown as MultiSelectFilterHandlerState;
    return (
      <Paper
        elevation={0}
        className={classNames({
          [classes.root]: true,
          [classes.darkThemeRoot]: !!darkTheme
        })}
      >
        <div className={classes.searchWrap}>
          <TextField
            variant="outlined"
            placeholder={placeholder}
            autoFocus={true}
            className={classes.search}
            onChange={(e) => this.setState({ searchValue: e.target.value })}
          />
        </div>
        <div className={classes.tagsList}>
          {(options || [])
            .filter(
              (opt) =>
                !(selectedValues as unknown as { id: unknown }[]).find((item) => item.id == opt.id) &&
                opt.name.toLowerCase().indexOf(searchValue.toLowerCase()) !== -1
            )
            .map((option) =>
              !selectedValues.includes(option.id.toString()) ? (
                <div key={option.id} className={classes.checkboxContainer}>
                  <Checkbox
                    checked={selectedValues.includes(option.id.toString())}
                    value={option.id}
                    onChange={this.handleChange}
                    inputProps={{ 'aria-label': option.name }}
                  />
                  <span>{option.name}</span>
                </div>
              ) : (
                ''
              )
            )}
        </div>
      </Paper>
    );
  };
}

const styled = withStyles(styles)(MultiSelectFilterHandler as never);
export default translate('StringFilterHandler')(styled as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
