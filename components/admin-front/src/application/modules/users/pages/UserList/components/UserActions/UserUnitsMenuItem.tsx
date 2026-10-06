import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
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

interface UserUnits {
  heads: string[];
  members: string[];
}

interface UserUnitsMenuItemProps {
  t: (key: string) => string;
  unitActions: {
    addError: (error: Error) => void;
    addUnitHeads: (unitId: string, userIds: string[]) => Promise<unknown>;
    deleteUnitHeads: (unitId: string, userIds: string[]) => Promise<unknown>;
    addUnitMembers: (unitId: string, userIds: string[]) => Promise<unknown>;
    deleteUnitMembers: (unitId: string, userIds: string[]) => Promise<unknown>;
  };
  user?: { id?: string; units?: UserUnits };
  onClose?: () => void;
  onChange?: () => void;
  readOnly?: boolean;
  classes: Record<string, string>;
}

interface UserUnitsMenuItemState {
  open: boolean;
  userUnits: UserUnits;
}

class UserUnitsMenuItem extends React.Component<UserUnitsMenuItemProps, UserUnitsMenuItemState> {
  state: UserUnitsMenuItemState = { open: false, userUnits: { heads: [], members: [] } };

  handleChange = (userUnits: UserUnits) => this.setState({ userUnits });

  handleSave = () => {
    const {
      unitActions,
      onChange = () => null,
      user: { id: userId, units: oldUserUnits } = {},
    } = this.props;
    const { userUnits: newUserUnits } = this.state;

    const includeHeadUnits = newUserUnits.heads.filter(
      (unitId) => !(oldUserUnits as UserUnits).heads.includes(unitId),
    );
    const excludeHeadUnits = (oldUserUnits as UserUnits).heads.filter(
      (unitId) => !newUserUnits.heads.includes(unitId),
    );

    const includeMemberUnits = newUserUnits.members.filter(
      (unitId) => !(oldUserUnits as UserUnits).members.includes(unitId),
    );
    const excludeMemberUnits = (oldUserUnits as UserUnits).members.filter(
      (unitId) => !newUserUnits.members.includes(unitId),
    );

    promiseChain([
      ...includeHeadUnits.map(
        (unitId) => () => unitActions.addUnitHeads(unitId, [userId as string]),
      ),
      ...excludeHeadUnits.map(
        (unitId) => () => unitActions.deleteUnitHeads(unitId, [userId as string]),
      ),
      ...includeMemberUnits.map(
        (unitId) => () => unitActions.addUnitMembers(unitId, [userId as string]),
      ),
      ...excludeMemberUnits.map(
        (unitId) => () => unitActions.deleteUnitMembers(unitId, [userId as string]),
      ),
    ])
      .then(onChange)
      .catch((e: Error) => {
        let error: Error & { data?: unknown; details?: unknown; autoClose?: boolean };
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
    const { t, user = {}, onClose = () => null, classes, readOnly } = this.props;
    const { open, userUnits } = this.state;

    return (
      <>
        <Tooltip title={t('UserUnits')}>
          <IconButton
            onClick={() =>
              this.setState({ open: true, userUnits: user.units as UserUnits }, onClose)
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
              onChange={handleChangeAdapter(
                userUnits as unknown as Record<string, unknown>,
                this.handleChange as unknown as (documentData: unknown, meta: { dataPath: string; changes: unknown }) => void
              )}
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

const mapDispatchToProps = (dispatch: Dispatch) => ({
  unitActions: {
    addError: bindActionCreators(addError, dispatch),
    addUnitHeads: bindActionCreators(addUnitHeads, dispatch),
    deleteUnitHeads: bindActionCreators(deleteUnitHeads, dispatch),
    addUnitMembers: bindActionCreators(addUnitMembers, dispatch),
    deleteUnitMembers: bindActionCreators(deleteUnitMembers, dispatch),
  },
});

const translated = translate('UserListPage')(UserUnitsMenuItem as never);
const styled = withStyles(styles)(translated as never);
const connected = connect(null, mapDispatchToProps)(styled as never);
export default dataTableConnect(unitListControlEndPoint)(connected as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
