import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import * as MuiIcons from '@mui/icons-material';
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
import { getCurrentLanguageCode, getTranslationCandidates } from 'helpers/localization';
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
    boxShadow: `0 -1px 0 ${theme?.borderColor || theme?.palette?.divider} inset`,
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
      backgroundColor: theme?.navLinkActive || theme?.palette?.action?.hover
    },
    '& svg': {
      fill: theme?.palette?.action?.active,
      backgroundColor: theme?.navLinkActive || theme?.palette?.action?.hover
    }
  },
  itemActiveItem: {
    color: theme?.palette?.primary?.main
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
      backgroundColor: theme?.palette?.background?.paper,
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
    color: theme?.palette?.error?.main,
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

const getFallbackCategories = () =>
  []
    .concat(...getModules().map((module) => module.navigation || []))
    .sort(prioritySort);

const resolveMenuName = (item, languageCode) => {
  const translations = item?.translations;

  if (translations && typeof translations === 'object') {
    for (const candidate of getTranslationCandidates(languageCode)) {
      if (typeof translations[candidate] === 'string' && translations[candidate].trim()) {
        return translations[candidate];
      }
    }
  }

  return item?.name || '';
};

const resolveMenuIcon = (iconValue) => {
  if (typeof iconValue !== 'string' || !iconValue.trim()) {
    return null;
  }

  if (
    iconValue.startsWith('data:image/') ||
    iconValue.startsWith('http://') ||
    iconValue.startsWith('https://') ||
    iconValue.startsWith('/')
  ) {
    return (
      <img
        src={iconValue}
        alt=""
        style={{ width: 24, height: 24, objectFit: 'contain', display: 'block' }}
      />
    );
  }

  const iconCandidates = [
    iconValue,
    iconValue.endsWith('Icon') ? iconValue.slice(0, -4) : `${iconValue}Icon`
  ];

  for (const candidate of iconCandidates) {
    const IconComponent = MuiIcons[candidate];

    if (IconComponent) {
      return <IconComponent />;
    }
  }

  return null;
};

const normalizeNavigationPath = (path) => {
  if (typeof path !== 'string' || !path.length) {
    return '';
  }

  return path.replace(/\/+$/, '') || '/';
};

const isExternalUrl = (path) => /^https?:\/\//i.test(path);

const resolveItemPath = (basePath, itemPath) => {
  if (typeof itemPath !== 'string' || !itemPath.length) {
    return normalizeNavigationPath(basePath);
  }

  if (isExternalUrl(itemPath)) {
    return itemPath;
  }

  if (itemPath.startsWith('/')) {
    return normalizeNavigationPath(itemPath);
  }

  const normalizedBasePath = normalizeNavigationPath(basePath);
  return normalizeNavigationPath(
    `${normalizedBasePath === '/' ? '' : normalizedBasePath}/${itemPath}`
  );
};

const resolveMenuId = (item, localizedName) => {
  if (typeof item?.path === 'string' && item.path.length) {
    return item.path.replace(/^\//, '');
  }

  const nameSource = localizedName || item?.name || item?.id || 'menu-item';
  return String(nameSource)
    .toLowerCase()
    .replace(/[^a-z0-9а-яіїєґ/_-]+/gi, '-')
    .replace(/^-+|-+$/g, '');
};

const mapNavigationTree = (items, languageCode, parentPath = '') =>
  (items || []).map((item) => {
    const path = resolveItemPath(parentPath, item?.path || item?.options?.route || '');
    const localizedName = resolveMenuName(item, languageCode);
    const children = Array.isArray(item.children)
      ? mapNavigationTree(item.children, languageCode, path || parentPath)
      : [];

    return {
      id: resolveMenuId({ ...item, path }, localizedName),
      title: localizedName || item?.name || item?.id,
      name: localizedName || item?.name,
      path: path || undefined,
      icon: resolveMenuIcon(item?.icon),
      access: item?.access,
      ...(children.length ? { children } : {})
    };
  });

const Navigator = (props) => {
  const {
    classes,
    location,
    location: { pathname },
    handleDrawerToggle,
    breadcrumbs,
    t,
    actions,
    navigationTree
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
    if (Array.isArray(navigationTree) && navigationTree.length) {
      setCategories(mapNavigationTree(navigationTree, getCurrentLanguageCode()));
      return;
    }

    setCategories(getFallbackCategories());
  }, [navigationTree]);

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
      {/* {checkAccess({
        access: {
          isUnitedUser: false,
          unitHasAccessTo: 'navigation.tasks.CreateTaskButton'
        }
      }) ? (
        <CreateTaskButton isSidebar={true} />
      ) : (
        <div className={classes.emptyCreateButton} />
      )}*/}

      <div className={classes.emptyCreateButton} />

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
  navigationTree: PropTypes.array,
  handleDrawerToggle: PropTypes.func.isRequired
};

Navigator.defaultProps = {
  location: { pathname: '' },
  navigationTree: null
};

const mapDispatchToProps = (dispatch) => ({
  actions: {
    logout: bindActionCreators(logout, dispatch)
  }
});

const mapStateToProps = ({ auth: { userUnits, info }, app: { navigationTree } }) => ({
  userUnits,
  userInfo: info,
  navigationTree
});

const translated = translate('Navigator')(Navigator);
const styled = withStyles(styles)(translated);
export default connect(mapStateToProps, mapDispatchToProps)(styled);
