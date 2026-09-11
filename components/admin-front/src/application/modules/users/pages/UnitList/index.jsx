/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import _ from 'lodash/fp';
import { history } from 'store';
import checkAccess from 'helpers/checkAccess';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { makeStyles } from '@mui/styles';
import AddIcon from '@mui/icons-material/Add';
import LeftSidebarLayout from 'layouts/LeftSidebar';
import ModulePage from 'components/ModulePage';
import endPoint from 'application/endPoints/units';
import { createUnit, clearNewUnit } from 'application/actions/units';
import { newUnitConfig } from 'application/reducers/units';
import dataTableConnect from 'services/dataTable/connect';
import dataTableAdapter from 'services/dataTable/adapter';
import DataTable from 'components/DataTable';
import StringElement from 'components/JsonSchema/elements/StringElement';
import dataTableSettings from './variables/dataTableSettings';
import ImportUnits from './components/ImportUnits';
import ExportUnits from './components/ExportUnits';
import DeleteUnits from './components/DeleteUnits';
import ExportUnitXLSX from './components/ExportUnitXLSX';
import { addMessage } from 'actions/error';
import Message from 'components/Snackbars/Message';
import { requestAllUnits } from 'actions/units';
import { getFavorites } from 'actions/favorites';

const useStyles = makeStyles((theme) => ({
  actionColor: {
    fill: theme.buttonBg,
    marginRight: 6,
  },
  actionBtn: {
    marginLeft: 16,
  },
  dialogTitle: {
    '& > h2': {
      marginTop: 20,
      fontWeight: 400,
      fontSize: 32,
      lineHeight: '38px',
      letterSpacing: '-0.02em',
    },
  },
  actionsWrapper: {
    paddingRight: 20,
    marginBottom: 20,
  },
  buttonsWrapper: {
    [theme.breakpoints.down('md')]: {
      marginTop: '10px',
    },
  },
}));

const ColorButton = withStyles((theme) => ({
  root: {
    color: theme.buttonBg,
    background: theme.searchInputBg,
    borderRadius: 4,
    paddingLeft: 10,
    '&:hover': {
      background: theme.listHover,
    },
  },
}))(Button);

class UnitsListPage extends ModulePage {
  constructor(props) {
    super(props);
    this.state = {
      open: false,
      busy: false,
      errorName: false,
      errorDescription: false,
      newUnit: {
        ...newUnitConfig,
        name: '',
        description: '',
      },
    };
  }

  handleChange = (field) => (value) => {
    const { newUnit } = this.state;
    this.setState({
      newUnit: {
        ...newUnit,
        [field]: value,
      },
    });
  };

  validate = () => {
    const {
      newUnit: { name },
    } = this.state;

    const errorName = !name.length;

    this.setState({
      errorName,
    });

    return !errorName;
  };

  handleCreateUnit = async () => {
    const { t, unitActions } = this.props;
    const { newUnit } = this.state;

    const valid = this.validate();

    if (!valid) return;

    this.setState({ busy: true });

    const created = await unitActions.createUnit(newUnit);

    this.setState({ busy: false });

    if (created instanceof Error) {
      unitActions.addMessage(new Message(t(created), 'error'));
      return;
    }

    history.replace(`/users/units/${created.id}`);

    unitActions.clearNewUnit();
  };

  componentDidMount = () => {
    super.componentDidMount();
    const { actions, unitActions } = this.props;

    unitActions.getFavorites({
      entity: 'units',
    });

    actions.load();
  };

  renderExportButtons = () => {
    const { rowsSelected } = this.props;

    const classes = useStyles();

    return (
      <>
        {(rowsSelected || []).length ? (
          <ExportUnits
            {...this.props}
            ColorButton={ColorButton}
            classes={classes}
          />
        ) : null}
        {(rowsSelected || []).length ? (
          <ExportUnitXLSX
            {...this.props}
            ColorButton={ColorButton}
            classes={classes}
          />
        ) : null}
      </>
    );
  };
  renderNewUnitButton = () => {
    const { t, rowsSelected, actions, userUnits, userInfo } = this.props;
    const { open, busy, newUnit, errorName, errorDescription } = this.state;

    const classes = useStyles();

    const hasAccess = checkAccess(
      {
        unitHasAccessTo: 'navigation.users.editable',
      },
      userInfo || {},
      userUnits || {},
    );

    if (!hasAccess) return this.renderExportButtons();

    return (
      <>
        <div className={classes.buttonsWrapper}>
          <ColorButton
            variant="contained"
            color="primary"
            disableElevation={true}
            onClick={() => this.setState({ open: true })}
          >
            <AddIcon className={classes.actionColor} />
            {t('CreateNewUnit')}
          </ColorButton>

          {(rowsSelected || []).length ? null : (
            <ImportUnits unitActions={actions} ColorButton={ColorButton} />
          )}

          {this.renderExportButtons()}

          {(rowsSelected || []).length ? (
            <DeleteUnits {...this.props} unitActions={actions} />
          ) : null}
        </div>
        <Dialog
          fullWidth={true}
          maxWidth="sm"
          onClose={() => !busy && this.setState({ open: false })}
          open={open}
        >
          <DialogTitle
            classes={{
              root: classes.dialogTitle,
            }}
          >
            {t('CreaingNewUnit')}
          </DialogTitle>
          <DialogContent>
            <StringElement
              description={t('UnitName')}
              required={true}
              fullWidth={true}
              darkTheme={true}
              disabled={busy}
              variant={'outlined'}
              onChange={this.handleChange('name')}
              value={newUnit.name || ''}
              inputProps={{ maxLength: 255 }}
              helperText={!!errorName ? t('RequiredField') : ''}
              error={!!errorName ? { message: t('RequiredField') } : null}
              maxLength={255}
            />

            <StringElement
              description={t('UnitId')}
              fullWidth={true}
              darkTheme={true}
              disabled={busy}
              variant={'outlined'}
              onChange={this.handleChange('id')}
              value={newUnit.id || ''}
              inputProps={{ maxLength: 7 }}
              maxLength={7}
            />

            <StringElement
              description={t('UnitDescription')}
              fullWidth={true}
              darkTheme={true}
              disabled={busy}
              variant={'outlined'}
              onChange={this.handleChange('description')}
              value={newUnit.description || ''}
              inputProps={{ maxLength: 255 }}
              helperText={!!errorDescription ? t('RequiredField') : ''}
              error={
                !!errorDescription ? { message: t('RequiredField') } : null
              }
              maxLength={255}
            />
          </DialogContent>
          <DialogActions className={classes.actionsWrapper}>
            <Button
              color="primary"
              disabled={busy}
              onClick={() => {
                this.setState({ open: false });
              }}
            >
              {t('Close')}
            </Button>

            <Button
              variant="contained"
              color="primary"
              disabled={busy}
              onClick={this.handleCreateUnit}
            >
              {busy ? <CircularProgress size={32} /> : t('Continue')}
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  };

  render = () => {
    const { t, title, loading, location, units } = this.props;

    const settings = dataTableSettings({ t, units });

    return (
      <LeftSidebarLayout location={location} title={t(title)} loading={loading}>
        <DataTable
          {..._.merge(settings, dataTableAdapter(this.props))}
          onRowClick={({ id }) => history.push(`/users/units/${id}`)}
          CustomToolbar={this.renderNewUnitButton}
        />
      </LeftSidebarLayout>
    );
  };
}

const translated = translate('UnitsListPage')(UnitsListPage);

const mapStateToProps = ({ auth: { userUnits, units, info: userInfo } }) => ({
  userUnits,
  units,
  userInfo,
});

const mapDispatchToProps = (dispatch) => ({
  unitActions: {
    createUnit: bindActionCreators(createUnit, dispatch),
    clearNewUnit: bindActionCreators(clearNewUnit, dispatch),
    addMessage: bindActionCreators(addMessage, dispatch),
    requestAllUnits: bindActionCreators(requestAllUnits, dispatch),
    getFavorites: bindActionCreators(getFavorites, dispatch),
  },
});

const conected = dataTableConnect(endPoint)(translated);
export default connect(mapStateToProps, mapDispatchToProps)(conected);
