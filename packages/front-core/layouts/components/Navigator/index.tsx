import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import * as MuiIcons from '@mui/icons-material';
import List from '@mui/material/List';
import { Theme } from '@mui/material/styles';
import withStyles from '@mui/styles/withStyles';
import MobileDetect from 'mobile-detect';
import React from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { bindActionCreators, Dispatch } from 'redux';
import { history } from 'store';

import { logout } from 'actions/auth';
import * as application from 'application';
import Scrollbar from 'components/Scrollbar';
import checkAccessHelper from 'helpers/checkAccess';
import { getCurrentLanguageCode, getTranslationCandidates } from 'helpers/localization';
import storage from 'helpers/storage';
import CategoryHeader from './CategoryHeader';
import Item, { MenuItem } from './Item';
import CreateTaskButton from 'modules/tasks/components/CreateTaskButton';

type AppTheme = Theme & {
  borderColor?: string;
  navLinkActive?: string;
};

const styles = (theme: AppTheme) => ({
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
    position: 'relative' as const,
    top: '-1px',
    '& svg': {
      fontSize: 23
    }
  },
  sidebarWrapper: {
    height: '100%',
    position: 'fixed' as const,
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
    overflowY: 'auto' as const
  }
});

interface NavigationTreeItem {
  path?: string;
  options?: { route?: string };
  translations?: Record<string, string>;
  name?: string;
  id?: string | number;
  icon?: string;
  access?: unknown;
  children?: NavigationTreeItem[];
  priority?: number;
  navigation?: NavigationCategory[];
  [key: string]: unknown;
}

interface NavigationCategory extends MenuItem {
  Component?: React.ComponentType<{ location?: unknown; handleDrawerToggle?: unknown }>;
  renderHeaderAnyway?: boolean;
  priority?: number;
  children?: NavigationCategory[];
}

const prioritySort = (a: NavigationCategory, b: NavigationCategory) => {
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

// admin-front's `application` module doesn't export `getModules` at all (only
// cabinet-front's does) — preserved as-is; calling this in admin-front throws
// the same "not a function" error the original untyped import produced.
const getModules = (application as unknown as { getModules?: () => NavigationTreeItem[] })
  .getModules as () => NavigationTreeItem[];

const getFallbackCategories = (): NavigationCategory[] =>
  ([] as NavigationCategory[])
    .concat(...getModules().map((module) => module.navigation || []))
    .sort(prioritySort);

const resolveMenuName = (item: NavigationTreeItem, languageCode: string | null) => {
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

const resolveMenuIcon = (iconValue?: string) => {
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
    const IconComponent = (MuiIcons as unknown as Record<string, React.ComponentType>)[candidate];

    if (IconComponent) {
      return <IconComponent />;
    }
  }

  return null;
};

const normalizeNavigationPath = (path?: string) => {
  if (typeof path !== 'string' || !path.length) {
    return '';
  }

  return path.replace(/\/+$/, '') || '/';
};

const resolveItemPath = (basePath: string | undefined, itemPath?: string) => {
  if (typeof itemPath !== 'string' || !itemPath.length) {
    return normalizeNavigationPath(basePath);
  }

  if (itemPath.startsWith('/')) {
    return normalizeNavigationPath(itemPath);
  }

  const normalizedBasePath = normalizeNavigationPath(basePath);
  return normalizeNavigationPath(
    `${normalizedBasePath === '/' ? '' : normalizedBasePath}/${itemPath}`
  );
};

const resolveMenuId = (item: NavigationTreeItem, localizedName?: string) => {
  if (typeof item?.path === 'string' && item.path.length) {
    return item.path.replace(/^\//, '');
  }

  const nameSource = localizedName || item?.name || item?.id || 'menu-item';
  return String(nameSource)
    .toLowerCase()
    .replace(/[^a-z0-9а-яіїєґ/_-]+/gi, '-')
    .replace(/^-+|-+$/g, '');
};

const mapNavigationTree = (
  items: NavigationTreeItem[] | undefined,
  languageCode: string | null,
  parentPath = '',
): NavigationCategory[] =>
  (items || []).map((item) => {
    const path = resolveItemPath(parentPath, item?.path || item?.options?.route || '');
    const localizedName = resolveMenuName(item, languageCode);
    const children = Array.isArray(item.children)
      ? mapNavigationTree(item.children, languageCode, path || parentPath)
      : [];

    return {
      id: resolveMenuId({ ...item, path }, localizedName),
      title: localizedName || item?.name || (item?.id as string),
      name: localizedName || item?.name,
      path: path || undefined,
      icon: resolveMenuIcon(item?.icon),
      access: item?.access,
      ...(children.length ? { children } : {})
    };
  });

interface NavigatorProps {
  classes: Record<string, string>;
  location: { pathname: string };
  handleDrawerToggle: (event: unknown) => void;
  breadcrumbs?: Array<{ callback?: () => void }>;
  t: (key: string) => string;
  actions: { logout: (redirect?: boolean) => void };
  navigationTree?: NavigationTreeItem[] | null;
  userUnits?: unknown;
  userInfo?: unknown;
}

const Navigator = (rawProps: NavigatorProps) => {
  // React 19 dropped `defaultProps` support for function components, so the
  // defaults formerly declared via `Navigator.defaultProps` below are
  // applied here instead, ahead of destructuring, to preserve exact
  // behavior.
  const props: NavigatorProps = { ...rawProps };
  props.location = props.location ?? { pathname: '' };
  props.navigationTree = props.navigationTree ?? null;
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

  const [categories, setCategories] = React.useState<NavigationCategory[]>([]);
  const [expanded, setExpanded] = React.useState<string[]>(() => {
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
    ({ access }: { access?: unknown }) => {
      const { userUnits, userInfo } = props;
      return !access || checkAccessHelper(access as Record<string, unknown>, userInfo as never, userUnits as never);
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
    storage.setItem('expandedCategories', expanded as never);
  }, [expanded]);

  const contentWithoutScroll = React.useCallback(() => {
    const expandedCategory = (id: string) => {
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
                    {...(category as unknown as Record<string, unknown>)}
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

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    logout: bindActionCreators(logout as never, dispatch)
  }
});

const mapStateToProps = ({ auth: { userUnits, info }, app: { navigationTree } }: {
  auth: { userUnits: unknown; info: unknown };
  app: { navigationTree: NavigationTreeItem[] };
}) => ({
  userUnits,
  userInfo: info,
  navigationTree
});

const translated = translate('Navigator')(Navigator as never);
const styled = withStyles(styles)(translated as never);
export default connect(mapStateToProps, mapDispatchToProps)(styled as never) as unknown as React.ComponentType<Record<string, unknown>>;
