import React from 'react';
import { translate } from 'react-translate';
import { bindActionCreators, Dispatch } from 'redux';
import classNames from 'classnames';
import { connect } from 'react-redux';
import { Theme } from '@mui/material/styles';
import { TextField, Paper } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import FilterHandler, { type FilterHandlerProps } from 'components/DataTable/components/FilterHandler';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import queueFactory from 'helpers/queueFactory';
import { searchUsers } from 'application/actions/users';
import Autocomplete from '@mui/material/Autocomplete';

type AppTheme = Theme & {
  listBackground?: Record<string, unknown>;
  header?: { textColor?: string };
};

const styles = (theme: AppTheme) => ({
  root: {
    display: 'flex',
    padding: 8,
  },
  field: {
    width: '100%',
  },
  darkThemeRoot: {
    padding: 17,
    ...(theme.listBackground || {}),
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
    color: theme.header?.textColor,
    ...(theme.listBackground || {}),
  },
});

interface UserOption {
  value?: string;
  userId?: string | number;
  ipn?: string;
  last_name?: string;
  first_name?: string;
  middle_name?: string;
  [key: string]: unknown;
}

// Deliberately NOT `extends FilterHandlerProps`: the base's `actions.searchUsers`
// is a single-arg `(params) => Promise<unknown>`, while this subclass's real
// usage always calls it with a second `query` arg and expects `UserOption[]`
// back — a stricter override that interface extension can't express without
// TS flagging it as an invalid narrowing. Cast at the `super(props)` call
// site instead of fighting the base type.
interface UsersFilterHandlerProps {
  type?: string | null;
  name?: string;
  value?: unknown;
  filterValue?: unknown;
  onChange?: (value: unknown, ...rest: unknown[]) => void;
  classes?: Record<string, string>;
  t?: (key: string, params?: Record<string, unknown>) => string;
  darkTheme?: boolean;
  fullInfo?: boolean;
  noPaper?: boolean;
  actions: {
    searchUsers: (params: Record<string, unknown>, query: string) => Promise<UserOption[]>;
  };
}

interface UsersFilterHandlerState {
  value: string;
  open: boolean;
  options: UserOption[];
  loading?: boolean;
}

class UsersFilterHandler extends FilterHandler {
  timeout?: ReturnType<typeof setTimeout>;
  queue: ReturnType<typeof queueFactory.get>;

  constructor(props: UsersFilterHandlerProps) {
    super(props as unknown as FilterHandlerProps);
    this.state = {
      value: props.value,
      open: false,
      options: [],
    } as unknown as typeof this.state;
    const { name } = props;
    this.queue = queueFactory.get(name as string);
  }

  handleSearch = (e: unknown, newValue: string) => {
    const { actions } = this.props as UsersFilterHandlerProps;

    this.setState({ value: newValue });

    if (newValue.length < 3) return;

    clearTimeout(this.timeout);

    const action = async () => {
      this.setState({ loading: true } as unknown as typeof this.state);

      const searchParams: Record<string, unknown> = {};

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

      this.setState({ options, loading: false } as unknown as typeof this.state);
    };

    this.timeout = setTimeout(() => this.queue.push(action), 500);
  };

  handleChange = (e: unknown, option: UserOption) => {
    const { onChange, fullInfo } = this.props as UsersFilterHandlerProps;
    localStorage.setItem('UsersFilterHandlerValue', JSON.stringify(option));
    onChange?.(fullInfo ? option : option.value || option.userId);
  };

  getUserDataToDisplay = () => {
    const saved = localStorage.getItem('UsersFilterHandlerValue');
    if (!saved) return '';
    const { last_name, first_name, middle_name, ipn, value } =
      JSON.parse(saved) as UserOption;
    return value || `${[last_name, first_name, middle_name].filter((v) => v && v !== 'null').join(' ')} (${ipn})`;
  };

  getOptionLabel = ({ ipn, last_name, first_name, middle_name, value }: UserOption) =>
    value || `${[last_name, first_name, middle_name].filter((v) => v && v !== 'null').join(' ')} (${ipn})`;

  renderInput = (params: Record<string, unknown>) => {
    const { t } = this.props;

    return (
      <TextField
        {...params}
        label={t?.('placeholder')}
        helperText={t?.('helper')}
        variant="outlined"
      />
    );
  };

  renderIcon = () => <AccountCircleIcon />;

  renderChip = () => {
    const { name } = this.props;
    return [name, this.getUserDataToDisplay()].join(': ');
  };

  componentDidMount = () => {
    const { filterValue, onChange } = this.props as UsersFilterHandlerProps & { filterValue?: string };
    filterValue && onChange?.(filterValue);
  };

  renderHandler = () => {
    const { classes, t, type, darkTheme, noPaper } = this.props as UsersFilterHandlerProps & { classes: Record<string, string> };
    const { value, options, loading } = this.state as unknown as UsersFilterHandlerState;

    const InputComponent = (
      <Autocomplete
        {...({ type } as unknown as Record<string, unknown>)}
        filterOptions={(x: UserOption[]) => x}
        options={options}
        loading={loading}
        inputValue={value}
        loadingText={t?.('loadingText')}
        noOptionsText={t?.('noOptionsText')}
        openText={t?.('openText')}
        onChange={this.handleChange as never}
        onInputChange={this.handleSearch as never}
        getOptionLabel={this.getOptionLabel as never}
        renderInput={this.renderInput as never}
        className={classNames({
          [classes.darkThemeAutocomplete]: !!darkTheme,
        })}
        classes={{
          paper: classNames({
            [classes.darkThemePaper]: !!darkTheme,
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
          [classes.darkThemeRoot]: !!darkTheme,
        })}
      >
        {InputComponent}
      </Paper>
    );
  };
}

(UsersFilterHandler as unknown as { defaultProps: Record<string, unknown> }).defaultProps = {
  name: '',
  value: '',
  type: null,
  filterValue: null,
  onChange: () => null,
};

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    searchUsers: bindActionCreators(searchUsers, dispatch),
  },
});

const styled = withStyles(styles)(UsersFilterHandler as never);
const translated = translate('StringFilterHandlerSearchable')(styled as never);
export default connect(null, mapDispatchToProps)(translated as never) as unknown as React.ComponentType<Record<string, unknown>>;
