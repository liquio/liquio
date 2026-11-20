import React from 'react';
import { translate } from 'react-translate';
import classNames from 'classnames';
import moment from 'moment';
import { Paper, TextField } from '@mui/material';
import { Theme } from '@mui/material/styles';
import withStyles from '@mui/styles/withStyles';
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker';
import DateRangeIcon from '@mui/icons-material/DateRange';

import FilterHandler, { type FilterHandlerProps } from 'components/DataTable/components/FilterHandler';

// This component's props (open/onClose combined with renderInput,
// disableToolbar/disableMaskedInput/disableHighlightToday, string `variant`)
// predate the installed @mui/x-date-pickers@5 API — same version mismatch
// already documented in components/KeyboardDatePicker/index.tsx; cast to a
// loose component type rather than fighting its real prop surface.
const DesktopDatePickerAny = DesktopDatePicker as unknown as React.ComponentType<Record<string, unknown>>;

const styles = (theme: Theme) => ({
  root: {
    display: 'flex',
    padding: 8
  },
  focuses: {
    '& fieldset': {
      borderColor: theme.palette.primary.main,
      borderWidth: 2
    }
  }
});

interface DateFilterHandlerState {
  value: string;
  open: boolean;
}

class DateFilterHandler extends FilterHandler {
  static defaultProps: Partial<FilterHandlerProps> = {
    ...FilterHandler.defaultProps,
    name: '',
    value: '',
    type: null,
    filterValue: null,
    onChange: () => null,
    disableToolbar: true,
    variant: 'static'
  };

  constructor(props: FilterHandlerProps) {
    super(props);

    this.state = {
      value: (props.value as string) || '',
      open: false
    };
  }

  renderIcon = () => {
    const { IconComponent } = this.props;

    if (IconComponent) {
      return <IconComponent />;
    }

    return <DateRangeIcon />;
  };

  handleClosePicker = () => this.setState({ open: false });

  handleOpenPicker = () => this.setState({ open: true });

  renderChip = () => {
    const { name, value } = this.props;
    return [name, moment(value as string, 'YYYY-MM-DD').format('DD-MM-YYYY')].join(': ');
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderInput = (params: any) => {
    const { classes, darkTheme } = this.props as FilterHandlerProps & { classes: Record<string, string> };

    return (
      <TextField
        {...params}
        variant={darkTheme ? 'outlined' : 'standard'}
        onClick={this.handleOpenPicker}
        classes={{
          root: classNames({
            [classes.focuses]: !!darkTheme
          })
        }}
      />
    );
  };

  componentDidMount = () => {
    const { filterValue, onChange } = this.props;
    filterValue && onChange?.(filterValue);
  };

  renderHandler() {
    const { classes, onChange, disableToolbar, variant } = this.props as FilterHandlerProps & {
      classes: Record<string, string>;
    };
    const { value, open } = this.state as unknown as DateFilterHandlerState;

    return (
      <Paper elevation={0} className={classes.root}>
        <DesktopDatePickerAny
          open={open}
          focus={true}
          disableToolbar={disableToolbar}
          variant={variant}
          format="YYYY-MM-DD"
          margin="normal"
          disableFuture={true}
          value={value || null}
          onChange={(newValue: { format: (fmt: string) => string }) =>
            onChange?.(newValue.format('YYYY-MM-DD'))
          }
          KeyboardButtonProps={{ 'aria-label': 'change date' }}
          disableMaskedInput={true}
          disableHighlightToday={true}
          renderInput={this.renderInput}
          onClose={this.handleClosePicker}
        />
      </Paper>
    );
  }
}

const styled = withStyles(styles)(DateFilterHandler as never);
export default translate('DateFilterHandler')(styled as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
