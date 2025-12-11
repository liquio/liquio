import React from 'react';
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { translate } from 'react-translate';
import { Icon } from '@iconify/react';
import { IconButton, Toolbar, Tooltip, Menu, CircularProgress } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ListIcon from 'assets/img/logs_icon.svg';
import ExportingIcon from 'assets/img/export.svg';
import checkAccess from 'helpers/checkAccess';
import {
  storeWorkflowData,
  changeWorkflowData,
  requestWorkflow
} from 'application/actions/workflow';
import ConfirmDialog from 'components/ConfirmDialog';
import DeleteWorkflow from './DeleteWorkflow';
import SubscribeWorkflow from './SubscribeWorkflow';
import CopyWorkflow from './CopyWorkflow';
import { getConfig } from '../../../../../../core/helpers/configLoader';

const userHasUnit = [1000000043, 1000003, 100003];

const WorkflowActions = ({
  t,
  workflow,
  actions,
  importActions,
  userInfo,
  userUnits,
  readOnly,
  subscribeEnabled
}) => {
  const config = getConfig();
  const [exporting, setExporting] = React.useState(false);
  const [updating, setUpdating] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [openChangeCategory, setOpenChangeCategory] = React.useState(false);

  const isMenuOpen = Boolean(anchorEl);

  const isTestCategory = config?.testCategory === workflow?.workflowTemplateCategoryId;

  const handleClick = ({ currentTarget }) => setAnchorEl(currentTarget);

  const handleClose = () => setAnchorEl(null);

  const exportWorkflow = async () => {
    if (exporting) return;
    setExporting(true);
    await actions.exportWorkflow(workflow);
    setExporting(false);
  };

  const hasAccess = checkAccess({ userHasUnit }, userInfo, userUnits);

  const toggleProcessCategoryAction = async () => {
    setUpdating(true);

    await importActions.requestWorkflow(workflow?.id);

    await importActions.storeWorkflowData(workflow?.id, {
      ...workflow,
      workflowTemplateCategoryId: isTestCategory ? null : config?.testCategory
    });

    actions.load();

    setOpenChangeCategory(false);

    setUpdating(false);
  };

  return (
    <>
      <Toolbar disableGutters={true}>
        {hasAccess && !readOnly ? (
          <Link to={`/workflow/journal#workflowTemplateId=${workflow.id}`}>
            <Tooltip title={t('Journal')}>
              <IconButton size="large">
                <img src={ListIcon} alt="list icon" width={21} />
              </IconButton>
            </Tooltip>
          </Link>
        ) : null}

        <Tooltip title={t('ExportWorkflow')} onClick={exportWorkflow}>
          <IconButton size="large">
            {exporting ? (
              <CircularProgress size={24} />
            ) : (
              <img src={ExportingIcon} alt="export icon" width={21} />
            )}
          </IconButton>
        </Tooltip>

        {config?.testCategory ? (
          <Tooltip title={t(isTestCategory ? 'ToWorkProcess' : 'ToTestProcess')}>
            <IconButton onClick={() => setOpenChangeCategory(true)} size="large">
              {updating ? (
                <CircularProgress size={24} />
              ) : (
                <Icon
                  icon={`ic:sharp-work${isTestCategory ? '' : '-off'}`}
                  color={'rgba(255, 255, 255, 0.7)'}
                  width={22}
                />
              )}
            </IconButton>
          </Tooltip>
        ) : null}

        {readOnly ? null : (
          <>
            <IconButton onClick={handleClick} size="large">
              <MoreVertIcon />
            </IconButton>

            <Menu anchorEl={anchorEl} open={isMenuOpen} onClose={handleClose} keepMounted={true}>
              <SubscribeWorkflow
                workflow={workflow}
                actions={actions}
                userInfo={userInfo}
                subscribeEnabled={subscribeEnabled}
              />
              <CopyWorkflow workflow={workflow} />
              <DeleteWorkflow workflow={workflow} actions={actions} />
            </Menu>
          </>
        )}

        <ConfirmDialog
          open={openChangeCategory}
          title={t('ChangeCategoryPrompt')}
          description={t(
            isTestCategory ? 'ChangeCategoryDescription' : 'ChangeCategoryTestDescription',
            {
              name: `"${workflow?.id} ${workflow?.name}"`
            }
          )}
          handleClose={() => setOpenChangeCategory(false)}
          handleConfirm={toggleProcessCategoryAction}
          darkTheme={true}
        />
      </Toolbar>
    </>
  );
};

const mapStateToProps = ({ auth: { info, userUnits } }) => ({
  userInfo: info,
  userUnits
});

const mapDispatchToProps = (dispatch) => ({
  importActions: {
    storeWorkflowData: bindActionCreators(storeWorkflowData, dispatch),
    changeWorkflowData: bindActionCreators(changeWorkflowData, dispatch),
    requestWorkflow: bindActionCreators(requestWorkflow, dispatch)
  }
});

const translated = translate('WorkflowListAdminPage')(WorkflowActions);
export default connect(mapStateToProps, mapDispatchToProps)(translated);
