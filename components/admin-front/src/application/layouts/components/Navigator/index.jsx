import React, { Fragment } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import qs from 'qs';
import { List } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { modules } from 'application';
import storage from 'helpers/storage';
import checkAccess from 'helpers/checkAccess';
import NavItem from 'layouts/components/Navigator/NavItem';
import Scrollbar from 'components/Scrollbar';

const prioritySort = (a, b) => {
  const aPriority = a.priority || 0;
  const bPriority = b.priority || 0;

  if (aPriority > bPriority) {
    return -1;
  }
  if (aPriority < bPriority) {
    return 1;
  }
  return 0;
};

const styles = () => ({
  root: {
    background: 'transparent',
  },
});

class Navigator extends React.Component {
  constructor(props) {
    super(props);

    const params = qs.parse(window.location.search, {
      ignoreQueryPrefix: true,
    });

    const onlyRegister = params?.only_register;

    if (onlyRegister) {
      storage.setItem('onlyRegister', onlyRegister);
    }

    if (!localStorage.getItem('Navigator'))
      localStorage.setItem('Navigator', JSON.stringify({}));
  }

  setStateForMenu = (categories) => {
    const storage = JSON.parse(localStorage.getItem('Navigator'));
    const storageKeysLength = Object.keys(storage).length;
    const menuItems = {};

    categories.forEach((i) => {
      /* init menus item in the first time */
      if (!storageKeysLength) {
        if (i.id) menuItems[i.id] = { open: false };
      }
      if (storageKeysLength) {
        /* check if meniItem not exist before */
        if (i.id && !storage[i.id]) {
          menuItems[i.id] = { open: true };
        }
        /* clear not used meniItems */
        if (i.id && storage[i.id]) {
          menuItems[i.id] = { ...storage[i.id] };
        }
      }
    });

    localStorage.setItem('Navigator', JSON.stringify(menuItems));
  };

  checkAccess = ({ access }) => {
    const { userUnits, userInfo } = this.props;

    const onlyRegister = storage.getItem('onlyRegister');

    if (
      onlyRegister &&
      access?.unitHasAccessTo !== 'navigation.registry.Registry'
    ) {
      return false;
    }

    return !access || checkAccess(access, userInfo, userUnits);
  };

  render() {
    const {
      location: { pathname },
      classes,
    } = this.props;

    const categories = []
      .concat(...modules.map((module) => module.navigation || []))
      .sort(prioritySort)
      .filter(this.checkAccess);

    this.setStateForMenu(categories);

    return (
      <Scrollbar
        options={{ suppressScrollX: true }}
        component="nav"
        saveRef={'navScrollBarRef'}
      >
        <List
          disablePadding={true}
          classes={{
            root: classes.root,
          }}
        >
          {categories.map((category, categoryKey) => {
            const childs = (category.children || []).filter(this.checkAccess);

            return (
              <Fragment key={categoryKey}>
                {category.id && !category.Component ? (
                  <NavItem
                    {...this.props}
                    pathname={pathname}
                    childs={childs}
                    {...category}
                  />
                ) : null}
                {category.Component ? (
                  <category.Component
                    {...this.props}
                    pathname={pathname}
                    childs={childs}
                    {...category}
                  />
                ) : null}
              </Fragment>
            );
          })}
        </List>
      </Scrollbar>
    );
  }
}

Navigator.propTypes = {
  location: PropTypes.object,
  userUnits: PropTypes.array.isRequired,
  userInfo: PropTypes.object.isRequired,
  handleDrawerToggle: PropTypes.func,
};
Navigator.defaultProps = {
  location: { pathname: '' },
  handleDrawerToggle: () => {},
};

const mapStateToProps = ({ auth: { userUnits, info } }) => ({
  userUnits,
  userInfo: info,
});

const translated = translate('Navigator')(Navigator);

const styled = withStyles(styles)(connect(mapStateToProps)(translated));

export default styled;
