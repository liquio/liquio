import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import List from '@mui/material/List';
import withStyles from '@mui/styles/withStyles';
import MobileDetect from 'mobile-detect';
import PropTypes from 'prop-types';
import React from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { bindActionCreators } from 'redux';
import { history } from 'store';

import { logout } from 'actions/auth';
import { getModules } from 'application';
import Scrollbar from 'components/Scrollbar';
import checkAccessHelper from 'helpers/checkAccess';
import storage from 'helpers/storage';
import CategoryHeader from 'layouts/components/Navigator/CategoryHeader';
import Item from 'layouts/components/Navigator/Item.jsx';
import CreateTaskButton from 'modules/tasks/components/CreateTaskButton';

const styles = (theme) => ({
  list: {
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 4
  },
  item: {
    paddingLeft: 0,
    paddingTop: 6,
    paddingBottom: 6,
    paddingRight: 0
  },
  itemCategory: {
    boxShadow: '0 -1px 0 #404854 inset',
    paddingTop: 16,
    paddingBottom: 16
  },
  firebase: {
    fontSize: 24,
    fontFamily: theme.typography.fontFamily,
    color: theme.palette.common.white
  },
  itemActionable: {
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, .1)'
    },
    '& svg': {
      fill: '#eee',
      backgroundColor: 'rgba(255, 255, 255, .1)'
    }
  },
  itemActiveItem: {
    color: '#4fc3f7'
  },
  itemPrimary: {
    color: 'inherit',
    fontSize: theme.typography.fontSize,
    '&$textDense': {
      fontSize: theme.typography.fontSize
    }
  },
  divider: {
    marginTop: 16
  },
  icon: {
    position: 'relative',
    top: '-1px',
    '& svg': {
      fontSize: 23
    }
  },
  sidebarWrapper: {
    height: '100%',
    position: 'fixed',
    '& > div': {
      minHeight: '100vh'
    }
  },
  emptyCreateButton: {
    marginTop: 12
  },
  actions: {
    padding: '16px 16px 40px 16px',
    '& p': {
      margin: 0,
      backgroundColor: '#fff',
      borderRadius: '8px',
      height: '56px',
      fontWeight: 500,
      fontSize: '14px',
      lineHeight: '21px',
      display: 'flex',
      alignItems: 'center',
      '&:not(:last-child)': {
        marginBottom: 12
      }
    }
  },
  profile: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 12px',
    '& span': {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px'
    }
  },
  logout: {
    color: '#B01038',
    justifyContent: 'center'
  },
  verticalScroll: {
    overflowY: 'auto'
  }
});

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

const Navigator = (props) => {
  const {
    classes,
    location,
    location: { pathname },
    handleDrawerToggle,
    breadcrumbs,
    t,
    actions
  } = props;

  const [categories, setCategories] = React.useState([]);
  const [expanded, setExpanded] = React.useState(() => {
    const saved = storage.getItem('expandedCategories');

    if (saved) {
      return saved.split(',');
    }

    return ['Tasks', 'Workflow'];
  });

  const [isMobile] = React.useState(() => {
    const md = new MobileDetect(window.navigator.userAgent);
    const isMobile = !!md.mobile();
    return isMobile;
  });

  const checkAccess = React.useCallback(
    ({ access }) => {
      const { userUnits, userInfo } = props;
      return !access || checkAccessHelper(access, userInfo, userUnits);
    },
    [props]
  );

  React.useEffect(() => {
    const categories = []
      .concat(...getModules().map((module) => module.navigation || []))
      .sort(prioritySort);
    setCategories(categories);
  }, []);

  React.useEffect(() => {
    storage.setItem('expandedCategories', expanded);
  }, [expanded]);

  const contentWithoutScroll = React.useCallback(() => {
    const expandedCategory = (id) => {
      if (expanded.includes(id)) {
        setExpanded(expanded.filter((item) => item !== id));
      } else {
        setExpanded([...expanded, id]);
      }
    };

    const onRedirectCallback = () => {
      const callback = breadcrumbs?.[0]?.callback;
      return callback && callback();
    };

    const handleLogout = () => {
      actions.logout(true);
    };
    return (
      <>
        <List className={classes.list} disablePadding={true}>
          {categories.filter(checkAccess).map((category, categoryKey) => {
            const children = (category.children || []).filter(checkAccess);

            return (
              <li key={categoryKey}>
                {category.id ? (
                  <CategoryHeader
                    pathname={pathname}
                    oneChild={children.length === 1 && !category.renderHeaderAnyway}
                    isParent={!!children.length}
                    expanded={expanded}
                    expandedCategory={expandedCategory}
                    onRedirectCallback={onRedirectCallback}
                    {...category}
                  >
                    {children.map((child, childKey) => {
                      return child.Component ? (
                        <child.Component key={childKey} location={location} />
                      ) : (
                        <Item key={childKey} menuItem={child} />
                      );
                    })}
                  </CategoryHeader>
                ) : null}
                {category.Component ? (
                  <category.Component location={location} handleDrawerToggle={handleDrawerToggle} />
                ) : null}
              </li>
            );
          })}
        </List>
        {isMobile ? (
          <div className={classes.actions}>
            <p
              aria-label={t('MyProfile')}
              onClick={() => {
                history.push('/profile');
              }}
              className={classes.profile}
            >
              <span>
                <AccountCircleOutlinedIcon />
                {t('MyProfile')}
              </span>
              <KeyboardArrowRightIcon />
            </p>
            <p aria-label={t('Logout')} onClick={handleLogout} className={classes.logout}>
              {t('Logout')}
            </p>
          </div>
        ) : null}
      </>
    );
  }, [
    categories,
    classes,
    expanded,
    handleDrawerToggle,
    isMobile,
    location,
    pathname,
    t,
    actions,
    breadcrumbs,
    checkAccess
  ]);

  return (
    <>
      {checkAccess({
        access: {
          isUnitedUser: false,
          unitHasAccessTo: 'navigation.tasks.CreateTaskButton'
        }
      }) ? (
        <CreateTaskButton isSidebar={true} />
      ) : (
        <div className={classes.emptyCreateButton} />
      )}

      {isMobile ? (
        <div className={classes.verticalScroll}>{contentWithoutScroll()}</div>
      ) : (
        <Scrollbar options={{ suppressScrollX: true }}>{contentWithoutScroll()}</Scrollbar>
      )}
    </>
  );
};

Navigator.propTypes = {
  classes: PropTypes.object.isRequired,
  location: PropTypes.object,
  userUnits: PropTypes.object.isRequired,
  userInfo: PropTypes.object.isRequired,
  handleDrawerToggle: PropTypes.func.isRequired
};

Navigator.defaultProps = {
  location: { pathname: '' }
};

const mapDispatchToProps = (dispatch) => ({
  actions: {
    logout: bindActionCreators(logout, dispatch)
  }
});

const mapStateToProps = ({ auth: { userUnits, info } }) => ({
  userUnits,
  userInfo: info
});

const translated = translate('Navigator')(Navigator);
const styled = withStyles(styles)(translated);
export default connect(mapStateToProps, mapDispatchToProps)(styled);
