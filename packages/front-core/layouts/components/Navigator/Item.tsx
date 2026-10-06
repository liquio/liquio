import React from 'react';
import { Badge, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import classNames from 'classnames';
import { NavLink } from 'react-router-dom';
import { translate } from 'react-translate';

import HoverMenu from './HoverMenu';
import styles from './itemStyles';

export interface MenuItem {
  name?: string;
  title?: string;
  badge?: number;
  id?: string | number;
  path?: string;
  icon?: React.ReactNode;
  children?: MenuItem[];
  access?: unknown;
  handleDrawerToggle?: (event: unknown) => void;
}

interface NavigationItemProps {
  t: (key: string) => string;
  classes: Record<string, string>;
  menuItem?: MenuItem;
  noPadding?: boolean;
}

const NavigationItem = ({ t, classes, menuItem, noPadding }: NavigationItemProps) => {
  const {
    name,
    title,
    badge,
    id: childId,
    path,
    icon,
    children,
    handleDrawerToggle,
  } = menuItem || {};

  if (children) {
    return <HoverMenu menuItem={menuItem} />;
  }

  return (
    <NavLink
      exact={true}
      to={path || ''}
      key={childId}
      className={classes.navLink}
      onClick={handleDrawerToggle}
      activeClassName="active"
      id={childId}
    >
      <ListItem
        dense={true}
        className={classNames(
          classes.item,
          classes.itemActionable,
          classes.subNavLink,
          {
            [classes.noPadding]: !!noPadding,
          },
        )}
      >
        {icon ? <ListItemIcon>{icon}</ListItemIcon> : null}
        <ListItemText
          classes={{
            primary: classes.itemPrimary,
            ...({ textDense: classes.textDense } as unknown as Record<string, unknown>),
          }}
        >
          {name || t(title || (childId as string))}
          {badge && Number.isInteger(badge) ? (
            <Badge
              badgeContent={badge}
              color="secondary"
              classes={{ badge: classes.badge }}
            />
          ) : null}
        </ListItemText>
      </ListItem>
    </NavLink>
  );
};

const styled = withStyles(styles)(NavigationItem as never);
export default translate('Navigator')(styled as never) as unknown as React.ComponentType<Record<string, unknown>>;
