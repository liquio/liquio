import { Badge, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import classNames from 'classnames';
import { NavLink } from 'react-router-dom';
import { translate } from 'react-translate';

import HoverMenu from 'layouts/components/Navigator/HoverMenu';
import styles from 'layouts/components/Navigator/itemStyles';

const NavigationItem = ({ t, classes, menuItem, noPadding }) => {
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
            textDense: classes.textDense,
          }}
        >
          {name || t(title || childId)}
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

const styled = withStyles(styles)(NavigationItem);
export default translate('Navigator')(styled);
