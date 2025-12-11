import React from 'react';
import classNames from 'classnames';
import { useDispatch } from 'react-redux';
import { useTranslate } from 'react-translate';
import { useAuth } from 'hooks/useAuth';
import { Button, CircularProgress } from '@mui/material';
import { makeStyles } from '@mui/styles';
import AddIcon from '@mui/icons-material/Add';
import IosShareIcon from '@mui/icons-material/IosShare';
import {
  deleteSnippetsGroup,
  getSnippetsGroups,
  createSnippetsGroup,
  updateSnippetsGroup,
  createSnippet,
  requestSnippets,
  updateSnippet,
  exportSnippets,
  importSnippets,
  deleteSnippet,
} from 'actions/snippets';
import CollapseButton from 'components/JsonSchema/editor/components/ElementDesktop/components/VisualEditor/components/ElementList/components/CollapseButton';
import Scrollbar from 'components/Scrollbar';
import { withEditor } from 'components/JsonSchema/editor/JsonSchemaProvider';
import ConfirmDialog from 'components/ConfirmDialog';
import StringElement from 'components/JsonSchema/elements/StringElement';
import ProgressLine from 'components/Preloader/ProgressLine';
import Message from 'components/Snackbars/Message';
import { addMessage } from 'actions/error';
import downloadBase64Attach from 'helpers/downloadBase64Attach';
import GroupedElementList from '../../VisualEditor/components/ElementList/components/GroupedElementList';
import CreateGroup from './CreateGroup';
import CreateControlSnippet from './CreateControlSnippet';
import { getConfig } from 'helpers/configLoader';

const withStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    borderRight: '#757575 1px solid',
  },
  opened: {
    width: 300,
  },
  parent: {
    '& span': {
      color: '#e2e2e2',
    },
  },
  child: {
    '& span': {
      color: '#e2e2e2',
    },
  },
  paper: {
    padding: 5,
  },
  headline: {
    display: 'flex',
    minWidth: 320,
    padding: 10,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
    marginLeft: 20,
    fontWeight: 500,
    fontSize: '14px',
    lineHeight: '20px',
    letterSpacing: '0.1px',
    color: '#CAC4D0',
    paddingLeft: 0,
  },
  search: {
    paddingLeft: 12,
    paddingRight: 12,
    marginBottom: 25,
    marginTop: 10,
  },
  divider: {
    flexGrow: 1,
    height: 1,
    background: '#49454F',
    marginLeft: 20,
    marginRight: 20,
    marginTop: 5,
    marginBottom: 5,
  },
  actionRoot: {
    color: 'inherit',
    justifyContent: 'flex-start',
    textTransform: 'inherit',
    fontWeight: 500,
    fontSize: 14,
    lineHeight: '20px',
    padding: 18,
  },
  actionLabel: {
    justifyContent: 'flex-start',
  },
  icon: {
    marginRight: 10,
  },
  importIcon: {
    transform: 'rotate(180deg)',
  },
});

const SnippetList = () => {
  const config = getConfig();
  const t = useTranslate('JsonSchemaEditor');
  const classes = withStyles();
  const dispatch = useDispatch();
  const { userUnits } = useAuth();

  const [open, setOpen] = React.useState(false);
  const [groups, setGroups] = React.useState([]);
  const [snippets, setSnippets] = React.useState([]);
  const [search, setSearch] = React.useState('');
  const [openGroup, setOpenGroup] = React.useState(false);
  const [activeGroup, setActiveGroup] = React.useState(null);
  const [confirmGroupDelete, setConfirmGroupDelete] = React.useState(false);
  const [groupsChanges, setGroupsChanges] = React.useState(false);
  const [groupsUpdating, setGroupsUpdating] = React.useState(false);
  const [createSnipper, setCreateSnippet] = React.useState(false);
  const [snippetsUpdating, setSnippetsUpdating] = React.useState(false);
  const [snippetsChanges, setSnippetsChanges] = React.useState(false);
  const [activeSnippet, setActiveSnippet] = React.useState(null);
  const [exporting, setExporting] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [confirmSnippetDelete, setConfirmSnippetDelete] = React.useState(false);
  const [chosenSnippetType, setChosenSnippetType] = React.useState(null);
  const [groupsLoading, setGroupsLoading] = React.useState(false);
  const [snippetsLoading, setSnippetsLoading] = React.useState(false);

  const filesRef = React.useRef(null);

  const readOnly = !userUnits.find(({ id }) => id === 1000015);

  React.useEffect(() => {
    const fetchData = async () => {
      setGroupsLoading(true);
      const result = await dispatch(getSnippetsGroups());
      setGroupsLoading(false);
      if (result instanceof Error) return;
      setGroups(result);
    };

    if (['development', 'stage'].includes(config?.application?.environment)) {
      fetchData();
    }
  }, [dispatch, groupsChanges, snippetsChanges]);

  React.useEffect(() => {
    const fetchData = async () => {
      setSnippetsLoading(true);
      const result = await dispatch(requestSnippets());
      setSnippetsLoading(false);
      if (result instanceof Error) return;
      setSnippets(result);
    };

    if (['development', 'stage'].includes(config?.application?.environment)) {
      fetchData();
    }
  }, [dispatch, snippetsChanges, groupsChanges]);

  const handleExportSnippets = async (idList) => {
    setExporting(true);
    const blob = await dispatch(exportSnippets(idList || null));
    setExporting(false);
    if (blob instanceof Error) return;
    const fileName = idList
      ? `snippet_${idList.idList[0]}.bpmn`
      : 'snippets-all.bpmn';

    downloadBase64Attach({ fileName }, blob);
  };

  const handleImportClick = () => filesRef.current.click();

  const handleImportSnippets = async (e) => {
    setImporting(true);
    const file = e.target.files[0];
    const result = await dispatch(importSnippets(file));
    setImporting(false);
    if (result instanceof Error) return;
    setSnippetsChanges(!snippetsChanges);
  };

  const handleCreateGroup = async (group) => {
    setGroupsUpdating(true);
    let result = null;
    if (activeGroup) {
      result = await dispatch(updateSnippetsGroup(activeGroup?.name, group));
    } else {
      result = await dispatch(createSnippetsGroup(group));
    }
    setGroupsUpdating(false);
    if (result instanceof Error) {
      dispatch(addMessage(new Message(result?.message, 'error')));
      return;
    }
    setOpenGroup(false);
    setGroupsChanges(!groupsChanges);
  };

  const handleDeleteGroup = async () => {
    setGroupsUpdating(true);
    const result = await dispatch(deleteSnippetsGroup(activeGroup?.name));
    setGroupsUpdating(false);
    if (result instanceof Error) {
      dispatch(addMessage(new Message(result?.message, 'error')));
      return;
    }
    setOpenGroup(false);
    setConfirmGroupDelete(false);
    setGroupsChanges(!groupsChanges);
  };

  const handleOpenConfirmDelete = () => {
    setOpenGroup(false);
    setConfirmGroupDelete(true);
  };

  const handleCloseGroupDialog = () => {
    setActiveGroup(null);
    setOpenGroup(false);
  };

  const handleCloseConfirmGroupDelete = () => {
    setConfirmGroupDelete(false);
    setActiveGroup(null);
  };

  const handleCreateSnippet = async (snippet) => {
    setSnippetsUpdating(true);
    let result = null;
    if (activeSnippet) {
      result = await dispatch(updateSnippet(activeSnippet.id, snippet));
    } else {
      result = await dispatch(createSnippet(snippet));
    }
    setSnippetsUpdating(false);
    if (result instanceof Error) {
      dispatch(addMessage(new Message(result?.message, 'error')));
      return;
    }
    setCreateSnippet(false);
    setSnippetsChanges(!snippetsChanges);
  };

  const handleConfirmDeleteSnippet = () => {
    setCreateSnippet(false);
    setConfirmSnippetDelete(true);
  };

  const handleCloseConfirmDeleteSnippet = () => {
    setConfirmSnippetDelete(false);
    setActiveSnippet(null);
  };

  const handleDeleteSnippet = async () => {
    setSnippetsUpdating(true);
    const result = await dispatch(deleteSnippet(activeSnippet.id));
    setSnippetsUpdating(false);
    if (result instanceof Error) {
      dispatch(addMessage(new Message(result?.message, 'error')));
      return;
    }
    setCreateSnippet(false);
    setSnippetsChanges(!snippetsChanges);
    handleCloseConfirmDeleteSnippet();
  };

  const handleCloseSnippetDialog = () => {
    setActiveSnippet(null);
    setCreateSnippet(false);
  };

  const handleOpenCreateSnippet = async (bool, type) => {
    setCreateSnippet(bool);
    setChosenSnippetType(type);
  };

  return (
    <div
      className={classNames(classes.root, {
        [classes.opened]: open,
      })}
    >
      <CollapseButton
        open={open}
        title={t('CollapseControlList')}
        onClick={() => setOpen(!open)}
      />

      {open ? (
        <div className={classes.search}>
          <StringElement
            description={t('SearchControls')}
            value={search}
            fullWidth={true}
            darkTheme={true}
            required={true}
            variant={'outlined'}
            onChange={setSearch}
            inputProps={{ maxLength: 255 }}
            noMargin={true}
          />
        </div>
      ) : null}
      {open ? (
        <Scrollbar options={{ disableHorizontalScrolling: true }}>
          <GroupedElementList
            groups={groups}
            snippets={snippets}
            search={search}
            readOnly={readOnly}
            setActiveGroup={setActiveGroup}
            setOpenGroup={setOpenGroup}
            handleOpenCreateSnippet={handleOpenCreateSnippet}
            setCreateSnippet={setCreateSnippet}
            setActiveSnippet={setActiveSnippet}
          />

          {groupsLoading || snippetsLoading ? <ProgressLine /> : null}

          {readOnly ? null : (
            <>
              <Button
                fullWidth={true}
                classes={{
                  root: classes.actionRoot,
                  label: classes.actionLabel,
                }}
                onClick={() => setOpenGroup(!openGroup)}
              >
                <AddIcon className={classes.icon} />
                {t('AddGroup')}
              </Button>

              <div className={classes.divider} />

              <Button
                fullWidth={true}
                classes={{
                  root: classes.actionRoot,
                  label: classes.actionLabel,
                }}
                onClick={() => handleExportSnippets()}
              >
                {exporting ? (
                  <CircularProgress size={24} className={classes.icon} />
                ) : (
                  <IosShareIcon className={classes.icon} />
                )}
                {t('ExportSnippets')}
              </Button>

              <input
                ref={filesRef}
                type="file"
                accept=".bpmn, application/bpmn"
                onChange={handleImportSnippets}
                hidden={true}
                multiple={false}
              />

              <Button
                fullWidth={true}
                classes={{
                  root: classes.actionRoot,
                  label: classes.actionLabel,
                }}
                onClick={handleImportClick}
              >
                {importing ? (
                  <CircularProgress size={24} className={classes.icon} />
                ) : (
                  <IosShareIcon
                    className={classNames({
                      [classes.icon]: true,
                      [classes.importIcon]: true,
                    })}
                  />
                )}

                {t('ImportSnippets')}
              </Button>
            </>
          )}
        </Scrollbar>
      ) : null}

      {openGroup ? (
        <CreateGroup
          t={t}
          readOnly={readOnly}
          groups={groups}
          open={true}
          loading={groupsUpdating}
          activeGroup={activeGroup}
          handleClose={handleCloseGroupDialog}
          handleCreateGroup={handleCreateGroup}
          handleDeleteGroup={handleOpenConfirmDelete}
        />
      ) : null}

      <ConfirmDialog
        open={confirmGroupDelete}
        loading={groupsUpdating}
        title={t('DeleteGroupPrompt')}
        description={t('DeleteGroupPromptDescription', {
          name: activeGroup?.name,
        })}
        handleClose={handleCloseConfirmGroupDelete}
        handleConfirm={handleDeleteGroup}
        darkTheme={true}
      />

      {createSnipper ? (
        <CreateControlSnippet
          t={t}
          readOnly={readOnly}
          loading={snippetsUpdating}
          groups={groups}
          activeSnippet={activeSnippet}
          open={createSnipper}
          chosenSnippetType={chosenSnippetType}
          handleCreateSnippet={handleCreateSnippet}
          handleDeleteSnippet={handleConfirmDeleteSnippet}
          handleClose={handleCloseSnippetDialog}
          handleExportSnippets={handleExportSnippets}
        />
      ) : null}

      <ConfirmDialog
        open={confirmSnippetDelete}
        loading={snippetsUpdating}
        title={t('DeleteSnippetPrompt')}
        description={t('DeleteSnippetPromptDescription', {
          name: activeSnippet?.name,
        })}
        handleClose={handleCloseConfirmDeleteSnippet}
        handleConfirm={handleDeleteSnippet}
        darkTheme={true}
      />
    </div>
  );
};

export default withEditor(SnippetList);
