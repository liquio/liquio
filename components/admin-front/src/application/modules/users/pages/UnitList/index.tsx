/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
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
import ModulePage, { type ModulePageProps } from 'components/ModulePage';
import endPoint from 'application/endPoints/units';
import { createUnit, clearNewUnit } from 'application/actions/units';
import { newUnitConfig } from 'application/reducers/units';
import dataTableConnect from 'services/dataTable/connect';
import dataTableAdapter from 'services/dataTable/adapter';
import DataTableRaw from 'components/DataTable';
import StringElementRaw from 'components/JsonSchema/elements/StringElement';
import dataTableSettings from './variables/dataTableSettings';
import ImportUnitsRaw from './components/ImportUnits';
import ExportUnitsRaw from './components/ExportUnits';
import DeleteUnitsRaw from './components/DeleteUnits';
import ExportUnitXLSXRaw from './components/ExportUnitXLSX';
import { addMessage } from 'actions/error';
import Message from 'components/Snackbars/Message';
import { requestAllUnits } from 'actions/units';
import { getFavorites } from 'actions/favorites';

const DataTable = DataTableRaw as unknown as React.ComponentType<Record<string, unknown>>;
const StringElement = StringElementRaw as unknown as React.ComponentType<Record<string, unknown>>;
const ImportUnits = ImportUnitsRaw as unknown as React.ComponentType<Record<string, unknown>>;
const ExportUnits = ExportUnitsRaw as unknown as React.ComponentType<Record<string, unknown>>;
const DeleteUnits = DeleteUnitsRaw as unknown as React.ComponentType<Record<string, unknown>>;
const ExportUnitXLSX = ExportUnitXLSXRaw as unknown as React.ComponentType<Record<string, unknown>>;

const useStyles = makeStyles((theme: { buttonBg?: string; breakpoints: { down: (key: string) => string } }) => ({
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

const ColorButton = withStyles((theme: { buttonBg?: string; searchInputBg?: string; listHover?: string }) => ({
  root: {
    color: theme.buttonBg,
    background: theme.searchInputBg,
    borderRadius: 4,
    paddingLeft: 10,
    '&:hover': {
      background: theme.listHover,
    },
  },
}))(Button as never) as unknown as React.ComponentType<Record<string, unknown>>;

interface NewUnit {
  id?: string;
  name: string;
  description: string;
  [key: string]: unknown;
}

interface UnitsListPageProps extends ModulePageProps {
  unitActions: {
    createUnit: (unit: NewUnit) => Promise<{ id: string } | Error>;
    clearNewUnit: () => void;
    addMessage: (message: unknown) => void;
    requestAllUnits: () => void;
    getFavorites: (params: { entity: string }) => void;
  };
  rowsSelected?: unknown[];
  userUnits: unknown[];
  userInfo: Record<string, unknown>;
  units: unknown[];
  location: unknown;
  loading?: boolean;
  actions: { load: () => void; [key: string]: unknown };
}

interface UnitsListPageState {
  open: boolean;
  busy: boolean;
  errorName: boolean;
  errorDescription: boolean;
  newUnit: NewUnit;
}

class UnitsListPage extends ModulePage<UnitsListPageProps> {
  state: UnitsListPageState;

  constructor(props: UnitsListPageProps) {
    super(props);
    this.state = {
      open: false,
      busy: false,
      errorName: false,
      errorDescription: false,
      newUnit: {
        ...(newUnitConfig as unknown as Record<string, unknown>),
        name: '',
        description: '',
      },
    };
  }

  handleChange = (field: string) => (value: unknown) => {
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
      // Original passes the whole Error object to `t`, not `created.message` —
      // a pre-existing quirk (translate() presumably stringifies it), preserved as-is.
      unitActions.addMessage(new Message((t as unknown as (key: unknown) => string)(created), 'error'));
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
      userUnits as never || {},
    );

    if (!hasAccess) return this.renderExportButtons();

    const t2 = t as (key: string, params?: Record<string, unknown>) => string;

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
            {t2('CreateNewUnit')}
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
            {t2('CreaingNewUnit')}
          </DialogTitle>
          <DialogContent>
            <StringElement
              description={t2('UnitName')}
              required={true}
              fullWidth={true}
              darkTheme={true}
              disabled={busy}
              variant={'outlined'}
              onChange={this.handleChange('name')}
              value={newUnit.name || ''}
              inputProps={{ maxLength: 255 }}
              helperText={!!errorName ? t2('RequiredField') : ''}
              error={!!errorName ? { message: t2('RequiredField') } : null}
              maxLength={255}
            />

            <StringElement
              description={t2('UnitId')}
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
              description={t2('UnitDescription')}
              fullWidth={true}
              darkTheme={true}
              disabled={busy}
              variant={'outlined'}
              onChange={this.handleChange('description')}
              value={newUnit.description || ''}
              inputProps={{ maxLength: 255 }}
              helperText={!!errorDescription ? t2('RequiredField') : ''}
              error={
                !!errorDescription ? { message: t2('RequiredField') } : null
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
              {t2('Close')}
            </Button>

            <Button
              variant="contained"
              color="primary"
              disabled={busy}
              onClick={this.handleCreateUnit}
            >
              {busy ? <CircularProgress size={32} /> : t2('Continue')}
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  };

  render = () => {
    const { t, title, loading, location, units } = this.props;

    const settings = dataTableSettings({ t: t as (key: string, params?: Record<string, unknown>) => string, units: units as never });

    return (
      <LeftSidebarLayout location={location} title={(t as (key: string) => string)(title as string)} loading={loading}>
        <DataTable
          {..._.merge(settings, dataTableAdapter(this.props))}
          onRowClick={({ id }: { id: string }) => history.push(`/users/units/${id}`)}
          CustomToolbar={this.renderNewUnitButton}
        />
      </LeftSidebarLayout>
    );
  };
}

const translated = translate('UnitsListPage')(UnitsListPage as never);

const mapStateToProps = ({ auth: { userUnits, units, info: userInfo } }: {
  auth: { userUnits: unknown[]; units: unknown[]; info: Record<string, unknown> };
}) => ({
  userUnits,
  units,
  userInfo,
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  unitActions: {
    createUnit: bindActionCreators(createUnit, dispatch),
    clearNewUnit: bindActionCreators(clearNewUnit, dispatch),
    addMessage: bindActionCreators(addMessage, dispatch),
    requestAllUnits: bindActionCreators(requestAllUnits, dispatch),
    getFavorites: bindActionCreators(getFavorites, dispatch),
  },
});

const conected = dataTableConnect(endPoint)(translated as never);
export default connect(mapStateToProps as never, mapDispatchToProps)(conected as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
