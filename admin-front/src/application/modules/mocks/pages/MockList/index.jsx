import React from 'react';
import PropTypes from 'prop-types';
import { connect , useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';
import { useTranslate } from 'react-translate';
import classNames from 'classnames';
import { EditorDialog } from 'components/Editor';
import uuid from 'uuid-random';
import {
  getOneMock,
  createOneMock,
  updateOneMock,
  deleteOneMock,
  getAllMocksIds,
} from 'actions/mock';
import { addMessage } from 'actions/error';
import {
  IconButton,
  Tooltip,
  CircularProgress,
  TableContainer,
  Table,
  TableHead,
  TableCell,
  TableBody,
  TableRow,
  Toolbar,
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  DialogActions,
  Typography,
  FormGroup,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { makeStyles } from '@mui/styles';
import EditIcon from '@mui/icons-material/Edit';
import LeftSidebarLayout from 'layouts/LeftSidebar';
import Message from 'components/Snackbars/Message';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import Collapse from '@mui/material/Collapse';
import Box from '@mui/material/Box';
import ConfirmDialog from 'components/ConfirmDialog';
import StringElement from 'components/JsonSchema/elements/StringElement';
import renderHTML from 'helpers/renderHTML';
import asModulePage from 'hooks/asModulePage';
import UsersFilterHandler from 'application/modules/workflow/pages/JournalList/components/UsersFilterHandler';

const useStyles = makeStyles((theme) => ({
  mockDescr: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  mockRow: {
    display: 'flex',
    alignItems: 'center',
    paddingBottom: 10,
    paddingTop: 5,
  },
  mockslist: {
    paddingLeft: 0,
  },
  root: {
    display: 'flex',
    color: '#e2e2e2',
    background: '#232323',
  },
  saveButton: {
    color: '#E2E2E2',
    position: 'absolute',
    right: 50,
    top: 4,
  },
  progress: {
    color: '#E2E2E2',
  },
  actionIcon: {
    marginLeft: 10,
  },
  disabled: {
    color: '#E2E2E2!important',
    opacity: 0.3,
  },
  deleteIcon: {
    position: 'absolute',
    top: 8,
    right: -45,
  },
  tableCell: {
    borderColor: theme.borderColor,
  },
  actions: {
    display: 'flex',
  },
  chosen: {
    background: theme.header.background,
  },
  chosenInner: {
    color: theme.palette.primary.main,
  },
  firstTableCell: {
    width: 50,
  },
  toolbar: {
    marginTop: 12,
    marginBottom: 12,
  },
  lastTableCell: {
    paddingLeft: 0,
  },
  mocksTable: {
    background: '#232323',
  },
  dialogDescription: {
    marginBottom: 30,
  },
  error: {
    fontSize: 14,
    marginTop: 10,
  },
}));

const EnabledMockPage = ({ actions, location, title }) => {
  const t = useTranslate('EnabledMockPage');
  const classes = useStyles();

  const [list, setList] = React.useState([]);

  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [opening, setOpening] = React.useState(false);

  const [openedRow, setSetOpenedRow] = React.useState({});
  const [deleteConfirm, setDeleteConfirm] = React.useState(false);
  const [changeHistory, setChangeHistory] = React.useState([]);
  const [editOpen, setEditOpen] = React.useState(false);
  const [value, setValue] = React.useState('');
  const [originValue, setOriginValue] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [choosingUser, setChoosingUser] = React.useState(false);
  const [chosenUserData, setChosenUserData] = React.useState(null);
  const [userError, setUserError] = React.useState(null);

  const userInfo = useSelector((state) => state.auth.info);

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const result = await actions.getAllMocksIds();

      setLoading(false);

      if (result instanceof Error) {
        actions.addMessage(new Message('ErrorGettingMocks', 'error'));
        return;
      }

      setList(result);
    };

    fetchData();
  }, [actions, changeHistory]);

  const RenderUserSelect = React.useMemo(() => {
    const handleClose = () => {
      setChoosingUser(false);
      setUserError(null);
    };

    const handleOpenEditDialog = () => {
      if (!chosenUserData) {
        setUserError(t('ChooseUserError'));
        return;
      }
      handleClose();
      setEditOpen({ action: 'create', reader: choosingUser });
    };

    return (
      <Dialog
        open={choosingUser}
        fullWidth={true}
        maxWidth="sm"
        onClose={handleClose}
      >
        <DialogTitle>{t('ChooseUser')}</DialogTitle>
        <DialogContent>
          <Typography className={classes.dialogDescription}>
            {t('ChooseUserDescription')}
          </Typography>
          <UsersFilterHandler
            name={t('Users')}
            label={t('Users')}
            darkTheme={true}
            fullInfo={true}
            noPaper={true}
            onChange={setChosenUserData}
          />

          <FormGroup>
            <FormControlLabel
              control={<Checkbox />}
              label={t('ChoseCurrentUser')}
              checked={userInfo.name === chosenUserData?.name}
              onChange={(event) => {
                setChosenUserData(event.target.checked ? userInfo : null);
              }}
            />
          </FormGroup>

          {userError ? (
            <Typography className={classes.error} color="error">
              {userError}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions className={classes.dialogActions}>
          <Button onClick={handleClose}>{t('Cancel')}</Button>
          <Button
            color="primary"
            variant="contained"
            onClick={handleOpenEditDialog}
          >
            {t('Save')}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }, [t, choosingUser, classes, chosenUserData, userError, userInfo]);

  const grouperByProvider = React.useMemo(() => {
    const mappedList = Object.keys(list || {})
      .map((key) => {
        return {
          name: key,
          id: key,
          provider: key.split('.')[0],
          data: Object.keys(list[key] || {}).map((key2) => {
            return {
              name: key2,
              data: list[key][key2],
            };
          }),
        };
      })
      .filter((item) => {
        return item.name.toLowerCase().includes(search.toLowerCase());
      })
      .map((item) => {
        return {
          ...item,
          data: item.data,
        };
      });

    const grouped = mappedList.reduce((acc, item) => {
      const provider = item.provider;
      return {
        ...acc,
        [provider]: [...(acc[provider] || []), item],
      };
    }, {});

    return grouped;
  }, [list, search]);

  const RenderEditor = React.useMemo(() => {
    const handleCloseDialog = () => {
      setEditOpen(false);
      setValue('');
      setOriginValue('');
      setChosenUserData(null);
    };

    const handleSave = async (newValue) => {
      setSaving(true);

      let result = null;

      if (editOpen?.action === 'create') {
        result = await actions.createOneMock({
          reader: editOpen?.reader,
          userRNOKPP: chosenUserData?.ipn,
          userEDRPOU: null,
          userFullName: chosenUserData?.name,
          data: JSON.parse(newValue || '{}'),
        });

        setEditOpen(false);
      } else {
        result = await actions.updateOneMock(editOpen?.mockId, {
          data: JSON.parse(newValue),
        });
      }

      const alreadyExists = `SequelizeDbError: Validation error: Key (reader, user_full_name)=(${editOpen?.reader}, ${chosenUserData?.name}) already exists.`;

      if (result instanceof Error) {
        let errorMessage;
        if (editOpen?.action === 'create') {
          errorMessage =
            result.message === alreadyExists
              ? t('ErrorCreatingMocks', {
                name: chosenUserData?.name,
              })
              : 'ErrorCreatingMocks';
        } else {
          errorMessage = 'ErrorUpdatingMocks';
        }

        actions.addMessage(new Message(errorMessage, 'error'));
        return;
      } else if (editOpen?.action === 'create') {
        actions.addMessage(new Message('CreatingMockSuccess', 'success'));
      }

      setSaving(false);
      setOriginValue(result);
      setChangeHistory(changeHistory.concat('edit'));
    };

    return (
      <EditorDialog
        open={!!editOpen}
        title={editOpen?.name}
        onClose={handleCloseDialog}
        value={value}
        handleSave={handleSave}
      />
    );
  }, [
    editOpen,
    classes,
    saving,
    errors,
    value,
    originValue,
    actions,
    changeHistory,
    chosenUserData,
    t,
  ]);

  const RenderConfirm = React.useMemo(() => {
    const handleDeleteMock = async () => {
      setDeleting(true);

      const result = await actions.deleteOneMock(deleteConfirm?.mockId);

      if (result instanceof Error) {
        actions.addMessage(new Message('DeletingMockError', 'error'));
      } else {
        actions.addMessage(new Message('DeletingMockSuccess', 'success'));
      }

      setDeleting(false);

      setDeleteConfirm(false);

      setChangeHistory(changeHistory.concat('delete'));
    };

    return (
      <ConfirmDialog
        darkTheme={true}
        loading={deleting}
        open={!!deleteConfirm}
        handleClose={() => setDeleteConfirm(false)}
        handleConfirm={handleDeleteMock}
        title={t('DeleteMockMethod')}
        description={t('DeleteMockDescription', {
          mock: deleteConfirm?.name,
        })}
      />
    );
  }, [deleteConfirm, t, deleting, actions, changeHistory]);

  const RenderTable = React.useMemo(() => {
    const getMockData = async ({ mockId, name, action }) => {
      setOpening(mockId);

      const result = await actions.getOneMock(mockId);

      setOpening(false);

      setValue(JSON.stringify(result?.data, null, 4));

      setOriginValue(result);

      setEditOpen({ mockId, name, action });
    };

    const markSearch = (string) => {
      if (!search?.length) return string;

      return renderHTML(
        (string || '').replace(
          new RegExp(`${search}`, 'gi'),
          `<mark>${search}</mark>`,
        ),
      );
    };

    return (
      <TableContainer>
        <Table className={classes.table}>
          <TableHead>
            <TableRow>
              <TableCell classes={{ root: classes.tableCell }}></TableCell>
              <TableCell classes={{ root: classes.tableCell }}>
                {t('name')}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.keys(grouperByProvider).map((id) => {
              const data = grouperByProvider[id];

              return (
                <>
                  <TableRow
                    key={uuid()}
                    className={classes.tableRow}
                    classes={{
                      root: classNames({
                        [classes.tableRow]: true,
                        [classes.chosen]: openedRow[id] === true,
                      }),
                    }}
                  >
                    <TableCell
                      classes={{
                        root: classNames({
                          [classes.tableCell]: true,
                          [classes.firstTableCell]: true,
                        }),
                      }}
                    >
                      <IconButton
                        aria-label="expand row"
                        size="small"
                        onClick={() => {
                          const opened = !!openedRow[id];

                          const openedRowUpdated = {
                            [id]: opened ? null : true,
                          };

                          setSetOpenedRow(openedRowUpdated);
                        }}
                      >
                        {openedRow?.id ? (
                          <KeyboardArrowUpIcon />
                        ) : (
                          <KeyboardArrowDownIcon />
                        )}
                      </IconButton>
                    </TableCell>

                    <TableCell classes={{ root: classes.tableCell }}>
                      {markSearch(id)}
                    </TableCell>
                  </TableRow>

                  <TableRow key={uuid()} className={classes.tableRow}>
                    <TableCell
                      classes={{
                        root: classNames({
                          [classes.tableCell]: true,
                          [classes.chosen]: openedRow[id] === true,
                        }),
                      }}
                      style={{ padding: 0, margin: 0 }}
                      colSpan={4}
                    >
                      <Collapse
                        timeout="auto"
                        unmountOnExit={true}
                        in={openedRow[id] === true || search.length > 0}
                      >
                        <Box margin={0}>
                          <Table size="small" aria-label="purchases">
                            <TableHead>
                              <TableRow className={classes.tableRow}>
                                <TableCell
                                  classes={{ root: classes.tableCell }}
                                />

                                <TableCell
                                  classes={{ root: classes.tableCell }}
                                >
                                  {t('method')}
                                </TableCell>

                                <TableCell
                                  classes={{
                                    root: classNames({
                                      [classes.tableCell]: true,
                                    }),
                                  }}
                                >
                                  {t('actions')}
                                </TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {(data || []).map(({ name, data: mocks }) => {
                                return (
                                  <>
                                    <TableRow
                                      key={uuid()}
                                      className={classes.mockslist}
                                    >
                                      <TableCell
                                        classes={{
                                          root: classNames({
                                            [classes.tableCell]: true,
                                            [classes.firstTableCell]: true,
                                          }),
                                        }}
                                      >
                                        <IconButton
                                          aria-label="expand row"
                                          size="small"
                                          onClick={() => {
                                            const opened = !!openedRow[name];

                                            const openedRowUpdated = {
                                              ...openedRow,
                                              [name]: opened ? null : true,
                                            };

                                            setSetOpenedRow(openedRowUpdated);
                                          }}
                                        >
                                          {openedRow?.name ? (
                                            <KeyboardArrowUpIcon />
                                          ) : (
                                            <KeyboardArrowDownIcon />
                                          )}
                                        </IconButton>
                                      </TableCell>

                                      <TableCell
                                        classes={{ root: classes.tableCell }}
                                      >
                                        {markSearch(name)}
                                      </TableCell>

                                      <TableCell
                                        classes={{
                                          root: classNames({
                                            [classes.tableCell]: true,
                                            [classes.lastTableCell]: true,
                                          }),
                                        }}
                                      >
                                        <div className={classes.actions}>
                                          <Tooltip
                                            title={t('AddProviderMethod')}
                                          >
                                            <IconButton
                                              onClick={() =>
                                                setChoosingUser(name)
                                              }
                                            >
                                              <AddIcon />
                                            </IconButton>
                                          </Tooltip>
                                        </div>
                                      </TableCell>
                                    </TableRow>

                                    <TableRow
                                      key={uuid()}
                                      className={classes.tableRow}
                                    >
                                      <TableCell
                                        classes={{
                                          root: classNames({
                                            [classes.tableCell]: true,
                                            [classes.chosen]:
                                              openedRow[id] === true ||
                                              search.length > 0,
                                          }),
                                        }}
                                        style={{ padding: 0, margin: 0 }}
                                        colSpan={4}
                                      >
                                        <Collapse
                                          timeout="auto"
                                          unmountOnExit={true}
                                          in={openedRow[name] === true}
                                        >
                                          <Box margin={0}>
                                            <Table
                                              size="small"
                                              aria-label="purchases"
                                              className={classes.mocksTable}
                                            >
                                              <TableHead>
                                                <TableRow
                                                  className={classes.tableRow}
                                                >
                                                  <TableCell
                                                    classes={{
                                                      root: classes.tableCell,
                                                    }}
                                                  />

                                                  <TableCell
                                                    classes={{
                                                      root: classes.tableCell,
                                                    }}
                                                  >
                                                    {t('mock')}
                                                  </TableCell>

                                                  <TableCell
                                                    classes={{
                                                      root: classes.tableCell,
                                                    }}
                                                  >
                                                    {t('actions')}
                                                  </TableCell>
                                                </TableRow>
                                              </TableHead>

                                              <TableBody>
                                                {(mocks || []).map(
                                                  ({ data: mockId, name }) => {
                                                    return (
                                                      <TableRow
                                                        key={uuid()}
                                                        className={
                                                          classes.mockslist
                                                        }
                                                      >
                                                        <TableCell
                                                          classes={{
                                                            root: classes.tableCell,
                                                          }}
                                                        />

                                                        <TableCell
                                                          classes={{
                                                            root: classNames({
                                                              [classes.tableCell]: true,
                                                              [classes.chosenInner]: true,
                                                            }),
                                                          }}
                                                        >
                                                          {name}
                                                        </TableCell>

                                                        <TableCell
                                                          classes={{
                                                            root: classNames({
                                                              [classes.tableCell]: true,
                                                              [classes.lastTableCell]: true,
                                                            }),
                                                          }}
                                                        >
                                                          <div
                                                            className={
                                                              classes.mockRow
                                                            }
                                                          >
                                                            <Tooltip
                                                              title={t('Edit')}
                                                            >
                                                              <IconButton
                                                                className={
                                                                  classes.actionIcon
                                                                }
                                                                onClick={() =>
                                                                  getMockData({
                                                                    mockId,
                                                                    name,
                                                                    action:
                                                                      'edit',
                                                                  })
                                                                }
                                                              >
                                                                {opening ===
                                                                  mockId ? (
                                                                  <CircularProgress
                                                                    size={24}
                                                                    className={
                                                                      classes.progress
                                                                    }
                                                                  />
                                                                ) : (
                                                                  <EditIcon
                                                                    size={24}
                                                                  />
                                                                )}
                                                              </IconButton>
                                                            </Tooltip>

                                                            <Tooltip
                                                              title={t(
                                                                'DeleteMock',
                                                              )}
                                                            >
                                                              <IconButton
                                                                className={
                                                                  classes.actionIcon
                                                                }
                                                                onClick={() =>
                                                                  setDeleteConfirm(
                                                                    {
                                                                      mockId,
                                                                      name,
                                                                    },
                                                                  )
                                                                }
                                                              >
                                                                <DeleteIcon />
                                                              </IconButton>
                                                            </Tooltip>
                                                          </div>
                                                        </TableCell>
                                                      </TableRow>
                                                    );
                                                  },
                                                )}
                                              </TableBody>
                                            </Table>
                                          </Box>
                                        </Collapse>
                                      </TableCell>
                                    </TableRow>
                                  </>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }, [classes, grouperByProvider, openedRow, t, opening, actions, search]);

  return (
    <LeftSidebarLayout location={location} loading={loading} title={t(title)}>
      <Toolbar className={classes.toolbar}>
        <StringElement
          onChange={setSearch}
          value={search}
          description={t('Search')}
          type="search"
          variant="outlined"
          darkTheme={true}
          required={true}
          noMargin={true}
        />
      </Toolbar>

      {RenderTable}

      {RenderEditor}

      {RenderConfirm}

      {RenderUserSelect}
    </LeftSidebarLayout>
  );
};

EnabledMockPage.propTypes = {
  actions: PropTypes.object.isRequired,
  location: PropTypes.object.isRequired,
  title: PropTypes.string.isRequired,
};

const mapDispatchToProps = (dispatch) => ({
  actions: {
    getOneMock: bindActionCreators(getOneMock, dispatch),
    createOneMock: bindActionCreators(createOneMock, dispatch),
    updateOneMock: bindActionCreators(updateOneMock, dispatch),
    deleteOneMock: bindActionCreators(deleteOneMock, dispatch),
    getAllMocksIds: bindActionCreators(getAllMocksIds, dispatch),
    addMessage: bindActionCreators(addMessage, dispatch),
  },
});

export default connect(null, mapDispatchToProps)(asModulePage(EnabledMockPage));
