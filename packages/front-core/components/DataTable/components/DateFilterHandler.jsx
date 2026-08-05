import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import classNames from 'classnames';
import moment from 'moment';
import { Paper, TextField } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker';
import DateRangeIcon from '@mui/icons-material/DateRange';

import FilterHandler from 'components/DataTable/components/FilterHandler';

const styles = (theme) => ({
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

class DateFilterHandler extends FilterHandler {
  constructor(props) {
    super(props);

    this.state = {
      value: props.value || '',
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
    return [name, moment(value, 'YYYY-MM-DD').format('DD-MM-YYYY')].join(': ');
  };

  renderInput = (params) => {
    const { classes, darkTheme } = this.props;

    return (
      <TextField
        {...params}
        variant={darkTheme ? 'outlined' : 'standard'}
        onClick={this.handleOpenPicker}
        classes={{
          root: classNames({
            [classes.focuses]: darkTheme
          })
        }}
      />
    );
  };

  componentDidMount = () => {
    const { filterValue, onChange } = this.props;
    filterValue && onChange(filterValue);
  };

  renderHandler() {
    const { classes, onChange, disableToolbar, variant } = this.props;
    const { value, open } = this.state;

    return (
      <Paper elevation={0} className={classes.root}>
        <DesktopDatePicker
          open={open}
          focus={true}
          disableToolbar={disableToolbar}
          variant={variant}
          format="YYYY-MM-DD"
          margin="normal"
          disableFuture={true}
          value={value || null}
          onChange={(newValue) => onChange(newValue.format('YYYY-MM-DD'))}
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

DateFilterHandler.propTypes = {
  classes: PropTypes.object.isRequired,
  name: PropTypes.string,
  value: PropTypes.string,
  type: PropTypes.string,
  onChange: PropTypes.func,
  filterValue: PropTypes.string,
  disableToolbar: PropTypes.bool,
  variant: PropTypes.bool
};

DateFilterHandler.defaultProps = {
  name: '',
  value: '',
  type: null,
  filterValue: null,
  onChange: () => null,
  disableToolbar: true,
  variant: 'static'
};

const styled = withStyles(styles)(DateFilterHandler);
export default translate('DateFilterHandler')(styled);
