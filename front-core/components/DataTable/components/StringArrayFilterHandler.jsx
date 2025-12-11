import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { TextField, Paper, IconButton, InputAdornment } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import InputIcon from '@mui/icons-material/Input';
import TextFormatIcon from '@mui/icons-material/TextFormat';

import FilterHandler from 'components/DataTable/components/FilterHandler';

const styles = {
  root: {
    display: 'flex',
    padding: 8
  }
};

class StringArrayFilterHandler extends FilterHandler {
  constructor(props) {
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
    filterValue && onChange(filterValue);
  };

  renderHandler() {
    const { classes, onChange, type } = this.props;
    const { value } = this.state;

    return (
      <Paper elevation={0} className={classes.root}>
        <TextField
          variant="standard"
          autoFocus={true}
          value={value.join(',')}
          onChange={({ target: { value: newValue } }) =>
            this.setState({ value: newValue.split(',') })
          }
          onKeyPress={({ key }) => key === 'Enter' && onChange(value)}
          type={type}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => onChange(value)} size="large">
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

StringArrayFilterHandler.propTypes = {
  classes: PropTypes.object.isRequired,
  name: PropTypes.string,
  value: PropTypes.string,
  type: PropTypes.string,
  onChange: PropTypes.func,
  filterValue: PropTypes.string
};

StringArrayFilterHandler.defaultProps = {
  name: '',
  value: '',
  type: null,
  filterValue: null,
  onChange: () => null
};

const styled = withStyles(styles)(StringArrayFilterHandler);
export default translate('StringFilterHandler')(styled);
