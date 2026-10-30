import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import diff from 'deep-diff';
import { history } from 'store';
import objectPath from 'object-path';
import { Button, Toolbar, IconButton, Tooltip } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { Theme } from '@mui/material/styles';
import CreateIcon from '@mui/icons-material/Create';
import DoneIcon from '@mui/icons-material/Done';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import StarIcon from '@mui/icons-material/Star';
import InfoIcon from '@mui/icons-material/Info';

import queueFactory from 'helpers/queueFactory';
import { requestUnit, updateUnitData, saveUnit } from 'application/actions/units';
import unitListControlEndPoint from 'application/endPoints/unitListControl';
import dataTableConnect from 'services/dataTable/connect';
import { addUnitHeads, deleteUnitHeads, addUnitMembers, deleteUnitMembers } from 'actions/units';
import { addMessage } from 'actions/error';
import Message from 'components/Snackbars/Message';
import StringElementRaw from 'components/JsonSchema/elements/StringElement';
import LeftSidebarLayout from 'layouts/LeftSidebar';
import ConfirmDialogRaw from 'components/ConfirmDialog';
import ModulePage, { type ModulePageProps } from 'components/ModulePage';
import Preloader from 'components/Preloader';
import { SchemaForm, validateData, handleChangeAdapter } from 'components/JsonSchema';
import ChipTabsRaw from 'components/ChipTabs';
import DownloadIcon from 'assets/icons/gg_import.svg';
import RenderOneLine from 'helpers/renderOneLine';
import { addFavorites, deleteFavorites, getFavoritesById } from 'actions/favorites';
import checkAccess from 'helpers/checkAccess';
import { getConfig } from 'core/helpers/configLoader';
import evaluate from 'helpers/evaluate';
import unitJsonSchema from './variables/unitJsonSchema';
import schemaParts from './variables/unitSchemaParts.json';
import UsersPart from './components/UsersPart';
import UnitList from './components/UnitList';
import InterfacePart from './components/InterfacePart';
import BlocksAccess from './components/BlocksAccess';

const StringElement = StringElementRaw as unknown as React.ComponentType<Record<string, unknown>>;
const ConfirmDialog = ConfirmDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;
const ChipTabs = ChipTabsRaw as unknown as React.ComponentType<Record<string, unknown>>;

const styles = (theme: Theme & { buttonHoverBg?: string; buttonBg?: string }) => ({
  iconWrapper: {
    marginLeft: 15,
    '&:hover': {
      backgroundColor: theme.buttonHoverBg
    }
  },
  changeNameWrapper: {
    display: 'flex',
    alignItems: 'center',
    width: '100%'
  },
  iconFilled: {
    fill: theme.buttonBg
  },
  infoIcon: {
    padding: 4,
    boxSizing: 'initial' as const,
    marginLeft: 15
  },
  chipsWrapper: {
    marginTop: 20,
    marginLeft: 20
  },
  fullWidth: {
    width: '100%',
    maxWidth: '100%'
  },
  content: {
    paddingLeft: 40,
    paddingRigth: 40
  },
  editFields: {
    width: '100%',
    '& > div': {
      marginBottom: 10
    }
  }
});

const ColorButton = withStyles((theme: Theme & { buttonBg?: string; searchInputBg?: string; listHover?: string }) => ({
  root: {
    marginRight: 60,
    marginBottom: 15,
    color: theme.buttonBg,
    background: theme.searchInputBg,
    borderRadius: 4,
    paddingLeft: 10,
    '&:hover': {
      background: theme.listHover
    }
  }
}))(Button as never) as unknown as React.ComponentType<Record<string, unknown>>;

interface Unit {
  id: string;
  name?: string;
  description?: string;
  adminUnit?: boolean;
  membersIpn: string[];
  headsIpn: string[];
  basedOn?: unknown;
  members?: unknown;
  heads?: unknown;
  allowTokens?: unknown;
  menuConfig?: { navigation?: Record<string, unknown> };
  [key: string]: unknown;
}

interface UnitPageProps extends ModulePageProps {
  match: { params: { unitId: string } };
  unitActions: {
    requestUnit: (unitId: string, options?: { silent: boolean }) => Promise<Unit | Error>;
    updateUnitData: (unit: Unit) => Promise<unknown>;
    saveUnit: (unit: Unit) => Promise<unknown>;
    addUnitHeads: (unitId: string, ids: string[]) => Promise<unknown>;
    deleteUnitHeads: (unitId: string, ids: string[]) => Promise<unknown>;
    addUnitMembers: (unitId: string, ids: string[]) => Promise<unknown>;
    deleteUnitMembers: (unitId: string, ids: string[]) => Promise<unknown>;
    addMessage: (message: unknown) => void;
    deleteFavorites: (params: { entity: string; id: string }) => Promise<unknown>;
    addFavorites: (params: { entity: string; id: string }) => Promise<unknown>;
    getFavoritesById: (params: { entity: string; id: string }) => Promise<Record<string, unknown>>;
  };
  actualUnitList: Record<string, Unit>;
  originUnitList: Record<string, Unit>;
  userUnits: unknown[];
  userInfo: Record<string, unknown>;
  classes: Record<string, string>;
  loading?: boolean;
  loadingProgressBar?: boolean;
  location: unknown;
}

interface UnitPageState {
  errors: string[];
  error: Error | null;
  activePart: number;
  loading: boolean;
  loadingProgressBar: boolean;
  isFavorite: boolean;
  newName: string;
  newDescription?: string;
  changingName?: boolean;
}

interface QueueLike {
  removeAllListeners: (event: string) => void;
  on: (event: string, cb: (...args: unknown[]) => void) => void;
  push: (action: () => void) => void;
}

class UnitPage extends ModulePage<UnitPageProps> {
  state: UnitPageState;
  setUserList: { control: string; callback: (data: unknown) => void } | null;
  queue: QueueLike;
  ref: React.RefObject<HTMLInputElement | null>;

  constructor(props: UnitPageProps) {
    super(props);
    this.state = {
      errors: [],
      error: null,
      activePart: 0,
      loading: false,
      loadingProgressBar: false,
      isFavorite: false,
      newName: ''
    };
    const {
      match: {
        params: { unitId }
      }
    } = props;

    this.setUserList = null;
    this.queue = queueFactory.get(unitId) as unknown as QueueLike;
    this.queue.removeAllListeners('end');
    this.queue.on('end', async () => {
      this.setState({ loadingProgressBar: true });

      const result = await this.getUnitData();

      if (this.setUserList && result) {
        const { control, callback } = this.setUserList;
        const { [control]: data } = result as unknown as Record<string, unknown>;
        if (!data) return;
        callback(data);
        this.setUserList = null;
      }

      this.setState({ loadingProgressBar: false });
    });

    this.ref = React.createRef();
  }

  startPreparing = () => (this.ref.current as HTMLInputElement).click();

  componentDidMount = () => this.getUnitData();

  componentDidUpdate = (prevProps?: UnitPageProps) => {
    const {
      match: {
        params: { unitId: oldUnitId }
      }
    } = prevProps as UnitPageProps;
    const {
      unitActions,
      actualUnitList,
      match: {
        params: { unitId: newUnitId }
      }
    } = this.props;

    if (newUnitId !== oldUnitId && !actualUnitList[newUnitId]) {
      unitActions.requestUnit(newUnitId);
    }
  };

  getUnitData = async () => {
    const {
      unitActions,
      match: {
        params: { unitId }
      }
    } = this.props;

    const result = await unitActions.requestUnit(unitId, {
      silent: true
    });

    const isFavorite = await unitActions.getFavoritesById({
      entity: 'units',
      id: unitId
    });

    this.setState({
      isFavorite: !!Object.keys(isFavorite).length
    });

    if (result instanceof Error) {
      history.replace('/');
      return;
    }

    return result;
  };

  validate = (unit: Unit) => {
    const { t } = this.props;
    const { activePart } = this.state;
    let errors: string[] = [];
    if (activePart === 3) {
      const validateFunction =
        '(propertyData) => {return propertyData.every(data =>/^\\d{10}\\r?$/.test(data) || /^\\d{9}\\r?$/.test(data) || /^[A-Za-z]{2}\\d{6}\\r?$/.test(data) || /^[А-Яа-яЁёЇїІіЄєҐґ]{2}\\d{6}\\r?$/.test(data));}';
      const evalMember = evaluate(validateFunction, unit.membersIpn);
      const evalHead = evaluate(validateFunction, unit.headsIpn);
      if (!evalMember) errors = errors.concat('member');
      if (!evalHead) errors = errors.concat('head');
    }
    errors = errors.concat(validateData(unit, unitJsonSchema(t as (key: string) => string)) as unknown as string[]);
    this.setState({ errors });
    return !errors.length;
  };

  handleChange = async (unit: Unit) => {
    const { unitActions } = this.props;

    const copyData = { ...unit };

    const param = objectPath.get(copyData, 'menuConfig.navigation.CreateTaskButton');

    objectPath.set(copyData, 'menuConfig.navigation.tasks.CreateTaskButton', param);

    await unitActions.updateUnitData(unit);
  };

  handleSave = () => {
    const {
      unitActions,
      actualUnitList,
      originUnitList,
      match: {
        params: { unitId }
      }
    } = this.props;

    if (!this.validate(actualUnitList[unitId])) {
      return null;
    }

    const dataToSave = {
      ...actualUnitList[unitId],
      ...{
        previousBasedOn: originUnitList[unitId].basedOn,
        previousMembers: originUnitList[unitId].members,
        previousHeads: originUnitList[unitId].heads,
        previousAllowTokens: originUnitList[unitId].allowTokens,
        previousHeadsIpn: originUnitList[unitId].headsIpn,
        previousMembersIpn: originUnitList[unitId].membersIpn
      }
    };

    delete (dataToSave.menuConfig as { navigation: Record<string, unknown> }).navigation.CreateTaskButton;

    return unitActions.saveUnit(dataToSave);
  };

  handleSaveAction = async () => {
    const {
      actualUnitList,
      originUnitList,
      match: {
        params: { unitId }
      }
    } = this.props;
    const { loading, loadingProgressBar } = this.state;

    const unit = actualUnitList[unitId];

    const origin = originUnitList[unitId];

    const diffs = diff(unit, origin || {});

    if (!diffs || loading || loadingProgressBar) {
      return;
    }

    this.setState({ loading: true });

    const isValid = await this.handleSave();

    if (isValid) await this.getUnitData();

    this.setState({ loading: false });
  };

  addMemberByCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { actualUnitList } = this.props;
    const {
      match: {
        params: { unitId }
      }
    } = this.props;
    const file = (e.target.files as FileList)[0];
    const reader = new FileReader();
    const isValidLine = (line: string) => line.length <= 10;

    reader.onload = async (event) => {
      const contents = event.target?.result as string;
      const parsedData = contents.split('\n');

      if (parsedData.length > 20) {
        const chunkedData: string[][] = [];
        const chunkSize = 20;
        const iterator = parsedData[Symbol.iterator]();
        let chunk = iterator.next();

        while (!chunk.done) {
          const currentChunk: string[] = [];
          for (let i = 0; i < chunkSize && !chunk.done; i++) {
            if (isValidLine(chunk.value)) {
              currentChunk.push(chunk.value);
            }
            chunk = iterator.next();
          }
          chunkedData.push(currentChunk);
        }

        let array = actualUnitList[unitId].membersIpn;

        this.setState({ loading: true });
        for (const chunk of chunkedData) {
          array = array.concat(chunk);
          this.handleChange({
            ...actualUnitList[unitId],
            membersIpn: array
          });
          await this.handleSave();
        }
        await this.getUnitData();
        this.setState({ loading: false });
      } else {
        this.handleChange({
          ...actualUnitList[unitId],
          membersIpn: actualUnitList[unitId].membersIpn.concat(parsedData.filter(isValidLine))
        });
        this.handleSaveAction();
      }
    };
    reader.readAsText(file);
  };

  componentGetTitle = (props?: { returnTitle: boolean }): string => {
    const { returnTitle } = props || {};
    const {
      t,
      unitActions,
      originUnitList,
      match: {
        params: { unitId }
      },
      classes,
      userInfo,
      userUnits
    } = this.props;

    const unit = originUnitList[unitId];
    const titleOutput = unit ? unit.name : (t as (key: string) => string)('Loading');

    if (returnTitle) {
      return titleOutput as string;
    }

    const hasAccess = checkAccess(
      {
        unitHasAccessTo: 'navigation.users.editable'
      },
      userInfo || {},
      userUnits as never || {}
    );

    const { changingName, newName, newDescription, isFavorite } = this.state;

    const handleOpen = () =>
      this.setState({
        changingName: true,
        newName: unit?.name,
        newDescription: unit?.description
      });

    const handleClose = () =>
      this.setState({
        changingName: false,
        newName: '',
        newDescription: ''
      });

    const handleChangeName = (value: string) => this.setState({ newName: value });

    const handleChangeDescription = (value: string) => this.setState({ newDescription: value });

    const handleSaveName = async () => {
      if (!newName.length) return;
      const newUnitData = { ...unit };
      objectPath.set(newUnitData, 'name', newName);
      objectPath.set(newUnitData, 'description', newDescription);
      await this.handleChange(newUnitData as Unit);
      this.handleSaveAction();
      this.setState({ changingName: false });
    };

    const handleToggleFavorite = async () => {
      const regBody = {
        entity: 'units',
        id: unitId
      };

      if (isFavorite) {
        await unitActions.deleteFavorites(regBody);
        this.setState({ isFavorite: false });
      } else {
        await unitActions.addFavorites(regBody);
        this.setState({ isFavorite: true });
      }
    };

    const favoritesTooltip = isFavorite ? (t as (key: string) => string)('RemoveFromFavorites') : (t as (key: string) => string)('AddToFavorites');

    const error = !newName.length
      ? {
          keyword: '',
          message: (t as (key: string) => string)('RequiredField')
        }
      : false;

    const isAdmin = unit?.adminUnit;

    return (
      <div className={classes.changeNameWrapper}>
        {!changingName ? (
          <>
            <RenderOneLine {...({ title: titleOutput, textParams: '400 30px Roboto' } as unknown as Record<string, unknown>)} />

            {hasAccess ? (
              <Tooltip title={isAdmin ? (t as (key: string) => string)('SystemEditName') : (t as (key: string) => string)('EditName')}>
                <span>
                  <IconButton
                    disabled={isAdmin}
                    onClick={handleOpen}
                    className={classes.iconWrapper}
                    size="large"
                  >
                    <CreateIcon />
                  </IconButton>
                </span>
              </Tooltip>
            ) : null}

            <Tooltip title={favoritesTooltip}>
              <IconButton
                onClick={handleToggleFavorite}
                className={classes.iconWrapper}
                size="large"
              >
                {isFavorite ? <StarIcon className={classes.iconFilled} /> : <StarBorderIcon />}
              </IconButton>
            </Tooltip>

            {unit?.description ? (
              <Tooltip title={unit?.description}>
                <InfoIcon className={classes.infoIcon} />
              </Tooltip>
            ) : null}
          </>
        ) : (
          <>
            <div className={classes.editFields}>
              <StringElement
                required={true}
                fullWidth={true}
                darkTheme={true}
                noMargin={true}
                useTrim={true}
                variant={'outlined'}
                placeholder={(t as (key: string) => string)('UnitName')}
                error={error}
                maxLength={255}
                value={newName}
                onChange={handleChangeName}
              />

              <StringElement
                required={true}
                fullWidth={true}
                darkTheme={true}
                noMargin={true}
                useTrim={true}
                variant={'outlined'}
                placeholder={(t as (key: string) => string)('UnitDescription')}
                maxLength={255}
                value={newDescription}
                onChange={handleChangeDescription}
              />
            </div>

            <IconButton onClick={handleSaveName} className={classes.iconWrapper} size="large">
              <DoneIcon />
            </IconButton>
            <IconButton onClick={handleClose} className={classes.iconWrapper} size="large">
              <CloseOutlinedIcon />
            </IconButton>
          </>
        )}
      </div>
    ) as unknown as string;
  };

  deleteMemberAction = async ({ userId, path, callback }: { userId: string; path: string[]; callback: (data: unknown) => void }) => {
    const {
      unitActions,
      match: {
        params: { unitId }
      }
    } = this.props;
    const control = path[path.length - 1];
    const body = [userId];
    this.setUserList = { control, callback };

    const action = async () => {
      this.setState({ loadingProgressBar: true });

      if (control === 'members') {
        const deleted = await unitActions.deleteUnitMembers(unitId, body);
        if (deleted instanceof Error) {
          unitActions.addMessage(new Message('DeletingUserError', 'error'));
        } else {
          unitActions.addMessage(new Message('DeletingUserSuccess', 'success'));
        }
      }

      if (control === 'heads') {
        const deleted = await unitActions.deleteUnitHeads(unitId, body);
        if (deleted instanceof Error) {
          unitActions.addMessage(new Message('DeletingHeadError', 'error'));
        } else {
          unitActions.addMessage(new Message('DeletingHeadSuccess', 'success'));
        }
      }

      this.setState({ loadingProgressBar: false });
    };

    this.queue.push(action);
  };

  addMemberAction = ({ userId, path, callback }: { userId: string; path: string[]; callback: (data: unknown) => void }) => {
    const {
      unitActions,
      match: {
        params: { unitId }
      }
    } = this.props;
    const control = path[path.length - 1];
    const body = [userId];
    this.setUserList = { control, callback };

    const action = async () => {
      this.setState({ loadingProgressBar: true });

      if (control === 'members') {
        const added = await unitActions.addUnitMembers(unitId, body);
        if (added instanceof Error) {
          unitActions.addMessage(new Message('AddingUserError', 'error'));
        } else {
          unitActions.addMessage(new Message('AddingUserSuccess', 'success'));
        }
      }

      if (control === 'heads') {
        const added = await unitActions.addUnitHeads(unitId, body);
        if (added instanceof Error) {
          unitActions.addMessage(new Message('AddingHeadError', 'error'));
        } else {
          unitActions.addMessage(new Message('AddingHeadSuccess', 'success'));
        }
      }

      this.setState({ loadingProgressBar: false });
    };

    this.queue.push(action);
  };

  renderContent = () => {
    const config = getConfig() as unknown as { allowTokens?: unknown[] };
    const handleChangeCast = this.handleChange as unknown as (
      documentData: unknown,
      meta: { dataPath: string; changes: unknown }
    ) => void;

    const {
      t,
      classes,
      actualUnitList,
      match: {
        params: { unitId }
      },
      userInfo,
      userUnits
    } = this.props;

    const { errors, error, activePart, loading } = this.state;

    const unit = actualUnitList[unitId];

    if (!unit || loading) return <Preloader />;

    const hasAccess = checkAccess(
      {
        unitHasAccessTo: 'navigation.users.editable'
      },
      userInfo || {},
      userUnits as never || {}
    );

    const userHasUnit = checkAccess(
      {
        userHasUnit: [1000001]
      },
      userInfo || {},
      userUnits as never || {}
    );

    const allowTokens = (config?.allowTokens || []).length;

    const t2 = t as (key: string) => string;

    const tabs = [
      {
        title: t2('Users').toUpperCase()
      },
      {
        title: t2('Heads').toUpperCase()
      },
      {
        title: t2('BasedOn').toUpperCase()
      },
      {
        title: t2('IPNUsers').toUpperCase()
      },
      {
        title: t2('Interface').toUpperCase(),
        hidden: !userHasUnit
      },
      {
        title: t2('Tokens').toUpperCase()
      },
      {
        title: t2('BlocksAccess').toUpperCase(),
        hidden: !allowTokens
      }
    ];

    const usersModule = activePart === 0;
    const headsModule = activePart === 1;
    const basedOnModule = activePart === 2;
    const ipnUsersModule = activePart === 3;
    const interfaceModule = userHasUnit ? activePart === 4 : false;
    const tokensModule = userHasUnit ? activePart === 5 : activePart === 4;
    const blockAcessesModule = userHasUnit
      ? allowTokens && activePart === 6
      : allowTokens && activePart === 5;

    return (
      <>
        <div className={classes.chipsWrapper}>
          <ChipTabs
            darkTheme={true}
            nativeStyle={true}
            activeIndex={activePart}
            onChange={(e: unknown, active: number) => this.setState({ activePart: active })}
            tabs={tabs}
          />
        </div>

        {usersModule ? (
          <UsersPart
            {...({
              active: 0,
              value: unit,
              classes,
              readOnly: !hasAccess,
              deleteAction: this.deleteMemberAction,
              addAction: this.addMemberAction,
              onChange: handleChangeAdapter(unit, handleChangeCast)
            } as unknown as Record<string, unknown>)}
          />
        ) : null}

        {headsModule ? (
          <UsersPart
            {...({
              active: 1,
              value: unit,
              classes,
              readOnly: !hasAccess,
              deleteAction: this.deleteMemberAction,
              addAction: this.addMemberAction,
              onChange: handleChangeAdapter(unit, handleChangeCast)
            } as unknown as Record<string, unknown>)}
          />
        ) : null}

        <div className={classes.content}>
          {basedOnModule ? (
            <SchemaForm
              errors={errors}
              schema={unitJsonSchema(t2)}
              value={unit}
              readOnly={!hasAccess}
              customControls={{
                UnitList: (props: Record<string, unknown>) => <UnitList {...props} excludeUnit={unit.id} />
              }}
              onChange={handleChangeAdapter(unit, handleChangeCast)}
            />
          ) : null}

          {ipnUsersModule ? (
            <>
              <ColorButton onClick={this.startPreparing}>
                <img src={DownloadIcon} alt="DownloadIcon" />
                {t2('UploadCSV')}
              </ColorButton>
              <input
                ref={this.ref}
                type="file"
                accept=".csv"
                onChange={this.addMemberByCSV}
                hidden={true}
              />
              <UsersPart
                {...({
                  active: 2,
                  value: unit,
                  readOnly: !hasAccess,
                  deleteAction: this.deleteMemberAction,
                  addAction: this.addMemberAction,
                  onChange: handleChangeAdapter(unit, handleChangeCast),
                  validate: this.validate,
                  errors
                } as unknown as Record<string, unknown>)}
              />
            </>
          ) : null}

          {interfaceModule ? (
            <InterfacePart
              value={unit}
              t={t2}
              readOnly={!hasAccess}
              onChange={handleChangeAdapter(unit, handleChangeCast)}
            />
          ) : null}

          {blockAcessesModule ? (
            <BlocksAccess
              value={unit as never}
              readOnly={!hasAccess}
              onChange={handleChangeAdapter(unit, handleChangeCast) as never}
            />
          ) : null}

          {tokensModule ? (
            <SchemaForm
              errors={errors}
              schema={schemaParts}
              value={unit}
              readOnly={!hasAccess}
              darkTheme={true}
              customControls={{
                UnitList: (props: Record<string, unknown>) => <UnitList {...props} excludeUnit={unit.id} />
              }}
              onChange={handleChangeAdapter(unit, handleChangeCast)}
            />
          ) : null}

          {![0, 1].includes(activePart) && hasAccess ? (
            <Toolbar disableGutters={true}>
              <Button variant="contained" color="primary" onClick={this.handleSaveAction}>
                {t2('Save')}
              </Button>
            </Toolbar>
          ) : null}
        </div>

        <ConfirmDialog
          fullScreen={false}
          darkTheme={true}
          open={!!error}
          title={t2('UnitErrorTitle')}
          description={error && t2((error as Error).message)}
          handleClose={() => this.setState({ error: null })}
        />
      </>
    );
  };

  render = () => {
    const { loading, location } = this.props;
    const { loadingProgressBar } = this.props;

    return (
      <LeftSidebarLayout
        {...({
          location,
          title: this.componentGetTitle(),
          loading: loading || loadingProgressBar
        } as unknown as Record<string, unknown>)}
      >
        {this.renderContent()}
      </LeftSidebarLayout>
    );
  };
}

const mapStateToProps = ({ units: { actual, origin }, auth: { userUnits, info: userInfo } }: {
  units: { actual: Record<string, Unit>; origin: Record<string, Unit> };
  auth: { userUnits: unknown[]; info: Record<string, unknown> };
}) => ({
  actualUnitList: actual,
  originUnitList: origin,
  userUnits,
  userInfo
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  unitActions: {
    saveUnit: bindActionCreators(saveUnit, dispatch),
    requestUnit: bindActionCreators(requestUnit, dispatch),
    updateUnitData: bindActionCreators(updateUnitData, dispatch),
    addUnitHeads: bindActionCreators(addUnitHeads, dispatch),
    deleteUnitHeads: bindActionCreators(deleteUnitHeads, dispatch),
    addUnitMembers: bindActionCreators(addUnitMembers, dispatch),
    deleteUnitMembers: bindActionCreators(deleteUnitMembers, dispatch),
    addMessage: bindActionCreators(addMessage, dispatch),
    deleteFavorites: bindActionCreators(deleteFavorites, dispatch),
    addFavorites: bindActionCreators(addFavorites, dispatch),
    getFavoritesById: bindActionCreators(getFavoritesById, dispatch)
  }
});

const styled = withStyles(styles)(UnitPage as never);
const translated = translate('UnitPage')(styled as never);
const connected = connect(mapStateToProps as never, mapDispatchToProps)(translated as never);
export default dataTableConnect(unitListControlEndPoint)(connected as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
