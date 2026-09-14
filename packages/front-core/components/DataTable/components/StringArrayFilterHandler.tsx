import React from 'react';
import { translate } from 'react-translate';
import { TextField, Paper, IconButton, InputAdornment } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import InputIcon from '@mui/icons-material/Input';
import TextFormatIcon from '@mui/icons-material/TextFormat';

import FilterHandler, { type FilterHandlerProps } from 'components/DataTable/components/FilterHandler';

const styles = {
  root: {
    display: 'flex',
    padding: 8
  }
};

interface StringArrayFilterHandlerState {
  value: string[];
}

class StringArrayFilterHandler extends FilterHandler {
  static defaultProps: Partial<FilterHandlerProps> = {
    ...FilterHandler.defaultProps,
    name: '',
    value: '',
    type: null,
    filterValue: null,
    onChange: () => null
  };

  constructor(props: FilterHandlerProps) {
    super(props);

    this.state = {
      value: Array.isArray(props.value) ? props.value : String(props.value).split(',')
    };
  }

  renderIcon = () => <TextFormatIcon />;

  renderChip = () => {
    const { name, value } = this.props;
    return [name, value].join(': ');
  };

  componentDidMount = () => {
    const { filterValue, onChange } = this.props;
    filterValue && onChange?.(filterValue);
  };

  renderHandler() {
    const { classes, onChange, type } = this.props as FilterHandlerProps & {
      classes: Record<string, string>;
    };
    const { value } = this.state as unknown as StringArrayFilterHandlerState;

    return (
      <Paper elevation={0} className={classes.root}>
        <TextField
          variant="standard"
          autoFocus={true}
          value={value.join(',')}
          onChange={({ target: { value: newValue } }) =>
            this.setState({ value: newValue.split(',') })
          }
          onKeyPress={({ key }: React.KeyboardEvent) => key === 'Enter' && onChange?.(value)}
          type={type as string}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => onChange?.(value)} size="large">
                  <InputIcon />
                </IconButton>
              </InputAdornment>
            )
          }}
        />
      </Paper>
    );
  }
}

const styled = withStyles(styles)(StringArrayFilterHandler as never);
export default translate('StringFilterHandler')(styled as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
