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
import itemStyles from './itemStyles';
import Item, { MenuItem } from './Item';

interface HoverMenuProps {
  t: (key: string) => string;
  classes: Record<string, string>;
  menuItem?: MenuItem;
  userUnits?: unknown;
  userInfo?: unknown;
}

const HoverMenu = ({ t, classes, menuItem, userUnits, userInfo }: HoverMenuProps) => {
  const [anchorEl, setAnchorEl] = React.useState<Element | null>(null);
  const { name, title, badge, id: childId, icon, children } = menuItem || {};

  const handleClose = () => setAnchorEl(null);

  const checkItemAccess = ({ access }: MenuItem) => {
    return !access || checkAccess(access as Record<string, unknown>, userInfo as never, userUnits as never);
  };

  return (
    <>
      <ListItem
        dense={true}
        onClick={({ currentTarget }: React.MouseEvent<HTMLElement>) => setAnchorEl(currentTarget)}
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
            ...({ textDense: classes.textDense } as unknown as Record<string, unknown>),
          }}
        >
          {name || t(title || (childId as string))}
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
        {(children as MenuItem[]).filter(checkItemAccess).map((child, key) => (
          <Item key={key} menuItem={child} noPadding={true} />
        ))}
      </Menu>
    </>
  );
};

const mapStateToProps = ({ auth: { userUnits, info } }: { auth: { userUnits: unknown; info: unknown } }) => ({
  userUnits,
  userInfo: info,
});

const styled = withStyles((theme) => ({ ...itemStyles(theme) }))(HoverMenu as never);
const translated = translate('Navigator')(styled as never);
export default connect(mapStateToProps)(translated as never) as unknown as React.ComponentType<Record<string, unknown>>;
