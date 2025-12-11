import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';

import { Chip, IconButton } from '@mui/material';

import withStyles from '@mui/styles/withStyles';

import { Search } from '@mui/icons-material';

import { SchemaForm } from 'components/JsonSchema';
import SelectUserDialog from 'components/SelectUserDialog';

import ChangeEvent from '../ChangeEvent';

const legalFields = ['companyName', 'edrpou'];
const unLegalFields = ['name', 'ipn'];

const fiterProps = (tabs, props = {}, currentTab) => {
  const keys = Object.keys(props);
  const filterFields = currentTab === 1 ? legalFields : unLegalFields;
  const filterForTabs = tabs
    ? keys.filter((key) =>
        props[key].tabsIds
          ? !!props[key].tabsIds.find((id) => id === currentTab)
          : true,
      )
    : keys.filter((key) => !filterFields.find((id) => id === key));
  return filterForTabs.filter((key) => !props[key].hidden);
};

const getTabId = (isLegal) => (isLegal ? 2 : 1);

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

class SelectUser extends React.Component {
  state = { openSelectUserDialog: false };

  handleSelect = (user) => {
    const { onChange } = this.props;

    const { isLegal, encodeCertSerial, encodeCert } = user || {};
    const properties = this.props.properties || {};

    const values = Object.keys(properties).reduce(
      (acc, key) => ({ ...acc, [key]: user[key] }),
      {
        encodeCertSerial,
        encodeCert,
        isLegal,
      },
    );

    this.setState(
      { openSelectUserDialog: false },
      () => onChange && onChange(values),
    );
  };

  handleChange = (name) => (value) => {
    const { onChange, value: oldValue } = this.props;
    const newValues = { ...oldValue, [name]: value };

    onChange && onChange(new ChangeEvent(newValues, false, true));
  };

  renderElement = (key, index) => {
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
            {...rest}
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
              className={classes.search}
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
    const { isLegal } = value || {};
    const currentTab = getTabId(isLegal);

    return (
      tabs &&
      tabs.map((tab) => (
        <Chip
          id={path.concat(tab.id, tab.description).join('-')}
          key={`tab-${tab.id}`}
          label={tab.description}
          onClick={
            !readOnly ? () => this.handleChange('isLegal')(tab.id === 2) : null
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

    const { isLegal } = value || {};
    const currentTab = getTabId(isLegal);
    const keys = fiterProps(tabs, properties, currentTab);

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

SelectUser.propTypes = {
  tabs: PropTypes.array,
  properties: PropTypes.object,
  value: PropTypes.object,
  onChange: PropTypes.func,
  t: PropTypes.func.isRequired,
  errors: PropTypes.array,
  required: PropTypes.oneOfType([PropTypes.bool, PropTypes.array]),
  formControlProps: PropTypes.object,
  path: PropTypes.array,
  readOnly: PropTypes.bool,
  signer: PropTypes.bool,
};

SelectUser.defaultProps = {
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

const translated = translate('Elements')(SelectUser);
export default withStyles(styles)(translated);
