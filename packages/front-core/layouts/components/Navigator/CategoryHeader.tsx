import React from 'react';
import { translate } from 'react-translate';
import { NavLink } from 'react-router-dom';
import classNames from 'classnames';
import { Theme } from '@mui/material/styles';
import { Badge, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import ArrowDropDownRoundedIcon from '@mui/icons-material/ArrowDropDownRounded';
import ArrowDropUpRoundedIcon from '@mui/icons-material/ArrowDropUpRounded';
import withStyles from '@mui/styles/withStyles';

import RenderOneLine from 'helpers/renderOneLine';

type AppTheme = Theme & {
  categoryWrapperActive?: string;
  outlineColor?: string;
  categoryHeader?: Record<string, unknown>;
  categoryHeaderActive?: Record<string, unknown>;
  textColorDark?: string;
  categoryHeaderPrimary?: Record<string, unknown>;
};

const styles = (theme: AppTheme) => ({
  categoryWrapper: {
    display: 'block',
  },
  categoryHeader: {
    cursor: 'pointer',
    padding: '8px 13px',
    marginBottom: 8,
    borderRadius: 56,
    transition: 'all .2s ease-in-out',
    '&:hover': {
      backgroundColor: theme.categoryWrapperActive,
    },
    '&:focus-visible': {
      borderRadius: 0,
      transition: 'none',
      outline: `${theme.outlineColor} solid 3px`,
    },
    ...(theme?.categoryHeader || {}),
  },
  active: {
    borderRadius: 56,
    backgroundColor: theme.categoryWrapperActive,
    ...(theme?.categoryHeaderActive || {}),
  },
  icon: {
    color: theme?.textColorDark || theme?.palette?.text?.primary,
    position: 'relative' as const,
    width: 24,
    height: 24,
    minWidth: 24,
    marginRight: 16,
  },
  categoryHeaderPrimary: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 16,
    fontStyle: 'normal',
    fontWeight: 500,
    lineHeight: '24px',
    letterSpacing: '0.15px',
    ...(theme?.categoryHeaderPrimary || {}),
  },
  anchor: {
    textDecoration: 'none',
    color: theme.palette.common.white,
  },
  navLink: {
    color: theme?.palette?.primary?.contrastText,
    textDecoration: 'none',
    borderRadius: 56,
    display: 'block',
  },
  emptyChildren: {
    display: 'none',
  },
  hidden: {
    display: 'none',
  },
  badge: {
    position: 'absolute' as const,
    right: 13,
    fontSize: 11,
    fontStyle: 'normal',
    fontHeight: 500,
    lineHeight: '16px',
    letterSpacing: '0.5px',
  },
  childWrapper: {
    paddingLeft: 39,
    marginBottom: 2,
  },
});

const highlight = (pathName: string, id: string) => pathName.indexOf(id.toLowerCase()) !== -1;

interface CategoryHeaderProps {
  t: (key: string) => string;
  classes: Record<string, string>;
  pathname: string;
  id: string;
  name?: string;
  title?: string;
  icon?: React.ReactNode;
  badge?: number;
  oneChild?: boolean;
  children?: React.ReactNode;
  expanded: string[];
  expandedCategory: (id: string) => void;
  isParent?: boolean;
  tabIndex?: number;
  onRedirectCallback?: () => void;
}

const CategoryHeader = ({
  t,
  classes,
  pathname,
  id,
  name,
  title,
  icon,
  badge,
  oneChild,
  children,
  expanded,
  expandedCategory,
  isParent,
  tabIndex,
  onRedirectCallback,
}: CategoryHeaderProps) => {
  const label = name || t(title || id);

  return (
    <div
      className={classNames({
        [classes.categoryWrapper]: true,
      })}
    >
      {oneChild ? null : (
        <ListItem
          tabIndex={tabIndex && !isParent ? tabIndex : 0}
          component={'div'}
          aria-label={label}
          className={classNames({
            [classes.categoryHeader]: true,
            [classes.active]: highlight(pathname, id) && !isParent,
          })}
          onClick={() => {
            onRedirectCallback && onRedirectCallback();
            expandedCategory(id);
          }}
          onKeyDown={(event: React.KeyboardEvent) => {
            if (event.key === 'Enter') {
              expandedCategory(id);
            }
          }}
        >
          {icon ? (
            <ListItemIcon className={classes.icon}>{icon}</ListItemIcon>
          ) : null}
          <ListItemText
            classes={{
              primary: classes.categoryHeaderPrimary,
            }}
          >
            <RenderOneLine title={label} initDelay={true} />

            {isParent ? (
              <>
                {!expanded.includes(id) ? (
                  <ArrowDropDownRoundedIcon />
                ) : (
                  <ArrowDropUpRoundedIcon />
                )}
              </>
            ) : null}
          </ListItemText>

          {badge && Number.isInteger(badge) ? (
            <Badge
              badgeContent={badge}
              color="secondary"
              classes={{ badge: classes.badge }}
            />
          ) : null}
        </ListItem>
      )}

      <div
        className={classNames({
          [classes.childWrapper]: true,
          [classes.hidden]: !expanded.includes(id),
        })}
      >
        {children}
      </div>
    </div>
  );
};

const isExternal = (url: string) => {
  const { location } = window;

  const match = url.match(
    /^([^:/?#]+:)?(?:\/\/([^/?#]*))?([^?#]+)?(\?[^#]*)?(#.*)?/,
  ) as RegExpMatchArray;
  if (
    typeof match[1] === 'string' &&
    match[1].length > 0 &&
    match[1].toLowerCase() !== location.protocol
  ) {
    return true;
  }
  if (
    typeof match[2] === 'string' &&
    match[2].length > 0 &&
    match[2].replace(
      new RegExp(
        ':(' + (({ 'http:': 80, 'https:': 443 } as Record<string, number>)[location.protocol]) + ')?$',
      ),
      '',
    ) !== location.host
  ) {
    return true;
  }
  return false;
};

interface CategoryHeaderContainerProps extends Omit<CategoryHeaderProps, 'pathname'> {
  path?: string;
  handleDrawerToggle?: (event: unknown) => void;
  pathname?: string;
}

const CategoryHeaderContainer = (rawProps: CategoryHeaderContainerProps) => {
  // React 19 dropped `defaultProps` support for function components, so the
  // defaults formerly declared via `CategoryHeaderContainer.defaultProps`
  // are applied here instead, ahead of destructuring, to preserve exact
  // behavior — `expanded`/`expandedCategory` aren't destructured here at
  // all, they're forwarded to the inner `<CategoryHeader>` via the
  // `{...props}` spread below.
  const props: CategoryHeaderContainerProps = { ...rawProps };
  props.path = props.path ?? '';
  props.handleDrawerToggle = props.handleDrawerToggle ?? undefined;
  props.expanded = props.expanded ?? [];
  props.expandedCategory = props.expandedCategory ?? (() => {});
  const { classes, path, handleDrawerToggle, id, t } = props;
  const label = props.name || t(props.title || id);

  const categoryHeader = <CategoryHeader {...(props as CategoryHeaderProps)} tabIndex={-1} />;

  if (path && isExternal(path)) {
    return (
      <a
        href={path}
        target="_blank"
        rel="noopener noreferrer"
        className={classes.anchor}
      >
        {categoryHeader}
      </a>
    );
  }

  return path ? (
    <NavLink
      exact={true}
      to={path || ''}
      target={isExternal(path) ? '_blank' : ''}
      onClick={handleDrawerToggle}
      activeClassName="active"
      className={classes.navLink}
      aria-label={label}
      id={label}
    >
      {categoryHeader}
    </NavLink>
  ) : (
    categoryHeader
  );
};

const styled = withStyles(styles)(CategoryHeaderContainer as never);

export default translate('Navigator')(styled as never) as unknown as React.ComponentType<Record<string, unknown>>;
