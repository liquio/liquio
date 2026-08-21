import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Tooltip,
} from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { SchemaForm, handleChangeAdapter } from 'components/JsonSchema';
import UnitList from 'application/modules/users/pages/Unit/components/UnitList';
import dataTableConnect from 'services/dataTable/connect';
import unitListControlEndPoint from 'application/endPoints/unitListControl';
import {
  addUnitHeads,
  deleteUnitHeads,
  addUnitMembers,
  deleteUnitMembers,
} from 'application/actions/units';
import { addError } from 'actions/error';
import promiseChain from 'helpers/promiseChain';
import PeopleIcon from 'assets/img/clarity_group-solid.svg';

const styles = () => ({
  root: {
    maxWidth: 600,
  },
});

class UserUnitsMenuItem extends React.Component {
  state = { open: false, userUnits: { heads: [], members: [] } };

  handleChange = (userUnits) => this.setState({ userUnits });

  handleSave = () => {
    const {
      unitActions,
      onChange,
      user: { id: userId, units: oldUserUnits },
    } = this.props;
    const { userUnits: newUserUnits } = this.state;

    const includeHeadUnits = newUserUnits.heads.filter(
      (unitId) => !oldUserUnits.heads.includes(unitId),
    );
    const excludeHeadUnits = oldUserUnits.heads.filter(
      (unitId) => !newUserUnits.heads.includes(unitId),
    );

    const includeMemberUnits = newUserUnits.members.filter(
      (unitId) => !oldUserUnits.members.includes(unitId),
    );
    const excludeMemberUnits = oldUserUnits.members.filter(
      (unitId) => !newUserUnits.members.includes(unitId),
    );

    promiseChain([
      ...includeHeadUnits.map(
        (unitId) => () => unitActions.addUnitHeads(unitId, [userId]),
      ),
      ...excludeHeadUnits.map(
        (unitId) => () => unitActions.deleteUnitHeads(unitId, [userId]),
      ),
      ...includeMemberUnits.map(
        (unitId) => () => unitActions.addUnitMembers(unitId, [userId]),
      ),
      ...excludeMemberUnits.map(
        (unitId) => () => unitActions.deleteUnitMembers(unitId, [userId]),
      ),
    ])
      .then(onChange)
      .catch((e) => {
        let error;
        // eslint-disable-next-line no-useless-escape
        const test = new RegExp(
          'Unit exclusive rules error with user (.+).',
          'gm',
        ).exec(e.message);
        if (test && test[1]) {
          const [, id] = test;
          error = new Error('FailSavingUnitExclusiveUnits');
          error.data = { userId: id };
        } else {
          error = new Error('Error');
          error.details = e.message;
        }
        error.autoClose = false;
        unitActions.addError(error);
      });

    this.setState({ open: false });
  };

  render() {
    const { t, user, onClose, classes, readOnly } = this.props;
    const { open, userUnits } = this.state;

    return (
      <>
        <Tooltip title={t('UserUnits')}>
          <IconButton
            onClick={() =>
              this.setState({ open: true, userUnits: user.units }, onClose)
            }
            size="large"
          >
            <img src={PeopleIcon} alt={'people icon'} />
          </IconButton>
        </Tooltip>
        <Dialog
          onClose={() => this.setState({ open: false })}
          open={open}
          fullWidth={true}
          classes={{
            paper: classes.root,
          }}
        >
          <DialogTitle>{t('SelectUserUnitsDialog')}</DialogTitle>
          <DialogContent>
            <SchemaForm
              customControls={{ UnitList }}
              value={userUnits}
              readOnly={readOnly}
              onChange={handleChangeAdapter(userUnits, this.handleChange)}
              schema={{
                type: 'object',
                properties: {
                  members: {
                    control: 'unit.list',
                    description: t('UnitMember'),
                    darkTheme: true,
                    variant: 'outlined',
                  },
                  heads: {
                    control: 'unit.list',
                    description: t('UnitHead'),
                    darkTheme: true,
                    variant: 'outlined',
                  },
                },
                required: ['members', 'heads'],
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button
              autoFocus={true}
              onClick={() => this.setState({ open: false })}
              color="primary"
            >
              {t('Cancel')}
            </Button>
            <Button onClick={this.handleSave} color="primary">
              {t('Save')}
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }
}

UserUnitsMenuItem.propTypes = {
  t: PropTypes.func.isRequired,
  unitActions: PropTypes.object.isRequired,
  user: PropTypes.object,
  onClose: PropTypes.func,
  onChange: PropTypes.func,
  readOnly: PropTypes.bool,
};

UserUnitsMenuItem.defaultProps = {
  user: {},
  onClose: () => null,
  onChange: () => null,
  readOnly: false,
};

const mapDispatchToProps = (dispatch) => ({
  unitActions: {
    addError: bindActionCreators(addError, dispatch),
    addUnitHeads: bindActionCreators(addUnitHeads, dispatch),
    deleteUnitHeads: bindActionCreators(deleteUnitHeads, dispatch),
    addUnitMembers: bindActionCreators(addUnitMembers, dispatch),
    deleteUnitMembers: bindActionCreators(deleteUnitMembers, dispatch),
  },
});

const translated = translate('UserListPage')(UserUnitsMenuItem);
const styled = withStyles(styles)(translated);
const connected = connect(null, mapDispatchToProps)(styled);
export default dataTableConnect(unitListControlEndPoint)(connected);
