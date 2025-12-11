import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { bindActionCreators } from 'redux';
import classNames from 'classnames';
import { connect } from 'react-redux';
import { TextField, Paper } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import FilterHandler from 'components/DataTable/components/FilterHandler';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import queueFactory from 'helpers/queueFactory';
import { searchUsers } from 'application/actions/users';
import Autocomplete from '@mui/material/Autocomplete';

const styles = (theme) => ({
  root: {
    display: 'flex',
    padding: 8,
  },
  field: {
    width: '100%',
  },
  darkThemeRoot: {
    padding: 17,
    ...theme.listBackground,
  },
  darkThemeAutocomplete: {
    width: '100%',
    '& fieldset': {
      borderColor: theme.palette.primary.main,
      borderWidth: 2,
      '& legend': {
        maxWidth: 0.01,
      },
    },
  },
  darkThemePaper: {
    color: theme.header.textColor,
    ...theme.listBackground,
  },
});

class UsersFilterHandler extends FilterHandler {
  constructor(props) {
    super(props);
    this.state = {
      value: props.value,
      open: false,
      options: [],
    };
    const { name } = props;
    this.queue = queueFactory.get(name);
  }

  handleSearch = (e, newValue) => {
    const { actions } = this.props;

    this.setState({ value: newValue });

    if (newValue.length < 3) return;

    clearTimeout(this.timeout);

    const action = async () => {
      this.setState({ loading: true });

      const searchParams = {};

      const isIpn = /^\d{8}$/.test(newValue) || /^\d{10}$/.test(newValue);
      const isId = newValue.length === 24 && newValue.split(' ').length === 1;

      if (isIpn) {
        searchParams.code = newValue;
      } else if (isId) {
        searchParams.ids = [newValue];
      } else {
        searchParams.search = newValue;
      }

      const options = await actions.searchUsers(
        searchParams,
        '?brief_info=true',
      );

      this.setState({ options, loading: false });
    };

    this.timeout = setTimeout(() => this.queue.push(action), 500);
  };

  handleChange = (e, option) => {
    const { onChange, fullInfo } = this.props;
    localStorage.setItem('UsersFilterHandlerValue', JSON.stringify(option));
    onChange(fullInfo ? option : option.value || option.userId);
  };

  getUserDataToDisplay = () => {
    const saved = localStorage.getItem('UsersFilterHandlerValue');
    if (!saved) return '';
    const { last_name, first_name, middle_name, ipn, value } =
      JSON.parse(saved);
    return value || `${last_name} ${first_name} ${middle_name} (${ipn})`;
  };

  getOptionLabel = ({ ipn, last_name, first_name, middle_name, value }) =>
    value || `${last_name} ${first_name} ${middle_name} (${ipn})`;

  renderInput = (params) => {
    const { t } = this.props;

    return (
      <TextField {...params} label={t('placeholder')} variant="outlined" />
    );
  };

  renderIcon = () => <AccountCircleIcon />;

  renderChip = () => {
    const { name } = this.props;
    return [name, this.getUserDataToDisplay()].join(': ');
  };

  componentDidMount = () => {
    const { filterValue, onChange } = this.props;
    filterValue && onChange(filterValue);
  };

  renderHandler = () => {
    const { classes, t, type, darkTheme, noPaper } = this.props;
    const { value, options, loading } = this.state;

    const InputComponent = (
      <Autocomplete
        type={type}
        filterOptions={(x) => x}
        options={options}
        loading={loading}
        inputValue={value}
        loadingText={t('loadingText')}
        noOptionsText={t('noOptionsText')}
        openText={t('openText')}
        onChange={this.handleChange}
        onInputChange={this.handleSearch}
        getOptionLabel={this.getOptionLabel}
        renderInput={this.renderInput}
        className={classNames({
          [classes.darkThemeAutocomplete]: darkTheme,
        })}
        classes={{
          paper: classNames({
            [classes.darkThemePaper]: darkTheme,
          }),
        }}
      />
    );

    if (noPaper) {
      return InputComponent;
    }

    return (
      <Paper
        className={classNames({
          [classes.root]: true,
          [classes.darkThemeRoot]: darkTheme,
        })}
      >
        {InputComponent}
      </Paper>
    );
  };
}

UsersFilterHandler.propTypes = {
  classes: PropTypes.object.isRequired,
  name: PropTypes.string,
  value: PropTypes.string,
  type: PropTypes.string,
  onChange: PropTypes.func,
  filterValue: PropTypes.string,
};

UsersFilterHandler.defaultProps = {
  name: '',
  value: '',
  type: null,
  filterValue: null,
  onChange: () => null,
};

const mapDispatchToProps = (dispatch) => ({
  actions: {
    searchUsers: bindActionCreators(searchUsers, dispatch),
  },
});

const styled = withStyles(styles)(UsersFilterHandler);
const translated = translate('StringFilterHandlerSearchable')(styled);
export default connect(null, mapDispatchToProps)(translated);
