import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { NavLink } from 'react-router-dom';
import classNames from 'classnames';
import { ListItemIcon, ListItem, ListItemText, Badge } from '@mui/material';
import withStyles from '@mui/styles/withStyles';

import HoverMenu from 'layouts/components/Navigator/HoverMenu';
import styles from 'layouts/components/Navigator/itemStyles';
import { getConfig } from '../../../../core/helpers/configLoader';

const NavigationItem = ({ t, classes, menuItem, noPadding, uiFilters }) => {
  const config = getConfig();

  const {
    name,
    title,
    badge,
    id: childId,
    path,
    icon,
    children,
    handleDrawerToggle,
    uiFilter,
    useWithoutUiFilter
  } = menuItem || {};

  if (children) {
    return <HoverMenu menuItem={menuItem} />;
  }

  let itemName = name || t(title || childId);

  if (config.useUIFilters) {
    const uiFilterResult = uiFilters.find(({ filter }) => filter === uiFilter);

    if (uiFilterResult) {
      itemName = uiFilterResult.name;
    } else if (!useWithoutUiFilter) {
      return null;
    }
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
        tabIndex={-1}
        component={'div'}
        className={classNames(classes.item, classes.itemActionable, classes.subNavLink, {
          [classes.noPadding]: !!noPadding
        })}
      >
        {icon ? <ListItemIcon>{icon}</ListItemIcon> : null}
        <ListItemText
          classes={{
            primary: classes.itemPrimary,
            textDense: classes.textDense
          }}
        >
          {itemName}
          {badge && Number.isInteger(badge) ? (
            <Badge badgeContent={badge} color="secondary" classes={{ badge: classes.badge }}>
              <span />
            </Badge>
          ) : null}
        </ListItemText>
      </ListItem>
    </NavLink>
  );
};

const mapState = ({ app: { uiFilters } }) => ({ uiFilters });

const styled = withStyles(styles)(NavigationItem);
const translated = translate('Navigator')(styled);
export default connect(mapState)(translated);
