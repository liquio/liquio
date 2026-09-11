import React, { Fragment } from 'react';
import { translate } from 'react-translate';

import { Chip, IconButton } from '@mui/material';

import withStyles, { WithStyles } from '@mui/styles/withStyles';

import { Search } from '@mui/icons-material';

import { SchemaForm } from 'components/JsonSchema';
import SelectUserDialog from 'components/SelectUserDialog';

import ChangeEvent from '../ChangeEvent';

const legalFields = ['companyName', 'edrpou'];
const unLegalFields = ['name', 'ipn'];

interface TabbedProperty {
  tabsIds?: number[];
  hidden?: boolean;
  [key: string]: unknown;
}

const fiterProps = (tabs: unknown[] | null, props: Record<string, TabbedProperty> = {}, currentTab: number) => {
  const keys = Object.keys(props);
  const filterFields = currentTab === 1 ? legalFields : unLegalFields;
  const filterForTabs = tabs
    ? keys.filter((key) =>
        props[key].tabsIds
          ? !!props[key].tabsIds?.find((id) => id === currentTab)
          : true,
      )
    : keys.filter((key) => !filterFields.find((id) => id === key));
  return filterForTabs.filter((key) => !props[key].hidden);
};

const getTabId = (isLegal?: boolean) => (isLegal ? 2 : 1);

const styles = {
  displayFlex: {
    display: 'flex',
  },
  flex: {
    flex: 1,
  },
  buttonContainer: {
    padding: '15px 0',
  },
};

interface SelectUserProps extends WithStyles<typeof styles> {
  t: (key: string) => string;
  tabs?: Array<{ id: number; description?: string }> | null;
  properties?: Record<string, TabbedProperty> | null;
  value?: Record<string, unknown> | null;
  onChange?: (value: unknown) => void;
  errors?: unknown[];
  required?: boolean | unknown[];
  formControlProps?: Record<string, unknown>;
  path: Array<string | number>;
  readOnly?: boolean;
  signer?: boolean;
  schema: { required?: string[] };
  hidden?: boolean;
  [key: string]: unknown;
}

interface SelectUserState {
  openSelectUserDialog: boolean;
}

class SelectUser extends React.Component<SelectUserProps, SelectUserState> {
  static defaultProps = {
    tabs: null,
    properties: null,
    value: null,
    onChange: undefined,
    errors: [],
    required: false,
    formControlProps: {},
    path: [],
    readOnly: false,
    signer: false,
  };

  state = { openSelectUserDialog: false };

  handleSelect = (user: Record<string, unknown>) => {
    const { onChange } = this.props;

    const { isLegal, encodeCertSerial, encodeCert } = user || {};
    const properties = this.props.properties || {};

    const values = Object.keys(properties).reduce(
      (acc, key) => ({ ...acc, [key]: user[key] }),
      {
        encodeCertSerial,
        encodeCert,
        isLegal,
      } as Record<string, unknown>,
    );

    this.setState(
      { openSelectUserDialog: false },
      () => onChange && onChange(values),
    );
  };

  handleChange = (name: string) => (value: unknown) => {
    const { onChange, value: oldValue } = this.props;
    const newValues = { ...oldValue, [name]: value };

    onChange && onChange(new ChangeEvent(newValues, false, true));
  };

  renderElement = (key: string, index: number) => {
    const { openSelectUserDialog } = this.state;
    const { classes, value, signer, schema, path, properties, ...rest } =
      this.props;

    if (!properties) {
      return null;
    }

    return (
      <div className={classes.displayFlex} key={key}>
        <div className={classes.flex}>
          <SchemaForm
            {...(rest as unknown as Record<string, unknown>)}
            {...properties[key]}
            schema={properties[key]}
            path={path.concat(key)}
            value={(value || {})[key]}
            required={(schema.required || []).includes(key)}
            onChange={this.handleChange(key)}
          />
        </div>
        {!index && signer ? (
          <div className={classes.buttonContainer}>
            <IconButton
              size="small"
              className={(classes as Record<string, string>).search}
              onClick={() =>
                this.setState({ openSelectUserDialog: !openSelectUserDialog })
              }
            >
              <Search />
            </IconButton>
          </div>
        ) : null}
      </div>
    );
  };

  renderTabs() {
    const { tabs, value, readOnly, path } = this.props;
    const { isLegal } = (value || {}) as { isLegal?: boolean };
    const currentTab = getTabId(isLegal);

    return (
      tabs &&
      tabs.map((tab) => (
        <Chip
          id={path.concat(tab.id, tab.description || '').join('-')}
          key={`tab-${tab.id}`}
          label={tab.description}
          onClick={
            !readOnly ? () => this.handleChange('isLegal')(tab.id === 2) : undefined
          }
          style={{
            background: currentTab === tab.id ? '#A8CFE8' : '#E1E1E1',
            color: currentTab === tab.id ? '#4398CD' : '#818181',
            margin: '27px 15px 0 0',
            display: 'inline-flex',
          }}
        />
      ))
    );
  }

  render() {
    const { openSelectUserDialog } = this.state;
    const { tabs, value, properties, hidden } = this.props;

    const { isLegal } = (value || {}) as { isLegal?: boolean };
    const currentTab = getTabId(isLegal);
    const keys = fiterProps(tabs || null, properties || {}, currentTab);

    if (hidden) return null;

    return (
      <Fragment>
        {this.renderTabs()}
        {keys.map(this.renderElement)}
        <SelectUserDialog
          open={openSelectUserDialog}
          onClose={() => this.setState({ openSelectUserDialog: false })}
          onUserSelect={this.handleSelect}
        />
      </Fragment>
    );
  }
}

const translated = translate('Elements')(SelectUser as never);
export default withStyles(styles)(translated as never) as unknown as React.ComponentType<Record<string, unknown>>;
