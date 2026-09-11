import React, { Fragment } from 'react';
import { translate } from 'react-translate';
import { Menu, Button } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import ArrowDropDown from '@mui/icons-material/ArrowDropDown';

import TreeList from 'components/TreeList';

const styles = {
  button: {
    padding: '14px 24px',
    marginTop: 8
  }
};

class KeySelect extends React.Component {
  state = { anchorEl: null };

  handleOpen = (event) => this.setState({ anchorEl: event.currentTarget });

  handleClose = () => this.setState({ anchorEl: null });

  handleChange = (selectedKey) => {
    const { onChange } = this.props;
    this.setState({ anchorEl: null }, () => {
      onChange && onChange(selectedKey);
    });
  };

  render() {
    const { t, classes, items, value, createLink } = this.props;
    const { anchorEl } = this.state;

    return (
      <Fragment>
        <Button
          className={classes.button}
          variant="outlined"
          size="large"
          onClick={this.handleOpen}
          aria-label={t('SelectRegistryKeyLabel')}
        >
          {value ? value.description || value.name : t('SelectRegistryKeyLabel')}
          <ArrowDropDown />
        </Button>
        <Menu
          anchorEl={anchorEl}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right'
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right'
          }}
          open={!!anchorEl}
          onClose={this.handleClose}
        >
          <TreeList items={items} onChange={this.handleChange} createLink={createLink} />
        </Menu>
      </Fragment>
    );
  }
}

const translated = translate('RegistryPage')(KeySelect);
export default withStyles(styles)(translated);
