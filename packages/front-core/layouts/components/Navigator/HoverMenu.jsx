import React from 'react';
import classNames from 'classnames';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import {
  ListItem,
  ListItemIcon,
  ListItemText,
  Badge,
  Menu,
} from '@mui/material';
import withStyles from '@mui/styles/withStyles';

import checkAccess from 'helpers/checkAccess';
import itemStyles from 'layouts/components/Navigator/itemStyles';
import Item from './Item';

const HoverMenu = ({ t, classes, menuItem, userUnits, userInfo }) => {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const { name, title, badge, id: childId, icon, children } = menuItem || {};

  const handleClose = () => setAnchorEl(null);

  const checkItemAccess = ({ access }) => {
    return !access || checkAccess(access, userInfo, userUnits);
  };

  return (
    <>
      <ListItem
        dense={true}
        onClick={({ currentTarget }) => setAnchorEl(currentTarget)}
        className={classNames(
          classes.item,
          classes.itemActionable,
          classes.subNavLink,
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
            >
              <span />
            </Badge>
          ) : null}
        </ListItemText>
      </ListItem>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        classes={{ paper: classes.paper }}
      >
        {children.filter(checkItemAccess).map((child, key) => (
          <Item key={key} menuItem={child} noPadding={true} />
        ))}
      </Menu>
    </>
  );
};

const mapStateToProps = ({ auth: { userUnits, info } }) => ({
  userUnits,
  userInfo: info,
});

const styled = withStyles((theme) => ({ ...itemStyles(theme) }))(HoverMenu);
const translated = translate('Navigator')(styled);
export default connect(mapStateToProps)(translated);
