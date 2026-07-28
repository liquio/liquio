import React from 'react';
import { translate } from 'react-translate';
import { connect, useDispatch } from 'react-redux';
import { IconButton, Tooltip, CircularProgress } from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';

import queueFactory from 'helpers/queueFactory';
import LeftSidebarLayout from 'layouts/LeftSidebar';
import DataTable from 'components/DataTable';
import ConfirmDialog from 'components/ConfirmDialog';
import endPoint from 'application/endPoints/workflow';
import endPointTestProcesses from 'application/endPoints/test_workflow';
import downloadBase64Attach from 'helpers/downloadBase64Attach';
import useTable from 'services/dataTable/useTable';
import urlHashParams from 'helpers/urlHashParams';
import asModulePage from 'hooks/asModulePage';
import { searchUsers } from 'actions/users';
import { getFavorites } from 'actions/favorites';
import { subscribeToProcess, unSubscribeToProcess, requestWorkflows } from 'actions/workflow';
import { getTagList } from 'application/actions/tags';
import checkAccess from 'helpers/checkAccess';
import dataTableSettings from './variables/dataTableSettings';
import WorkflowTableToolbar from './components/WorkflowTableToolbar';

const SEARCH_KEYS = [
  'matchedDocumentJsonSchema',
  'matchedEventJsonSchema',
  'matchedGatewayJsonSchema',
  'matchedTaskJsonSchema',
  'matchedDocumentAdditionalDataToSign'
];

const WorkflowListPage = ({
  t,
  history,
  location,
  title,
  userInfo,
  userUnits,
  isTestProcesses
}) => {
  const [mappedData, setData] = React.useState([]);
  const [rowsSelected, onRowsSelect] = React.useState([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [workflows, setWorkflows] = React.useState([]);
  const [tags, setTags] = React.useState([]);
  const tagsRef = React.useRef({});
  const moreTagsRef = React.useRef({});

  const dispatch = useDispatch();

  const queue = React.useMemo(() => queueFactory.get('subscribeQueue'), []);

  const isEditable = checkAccess({ userHasUnit: [1000002] }, userInfo, userUnits);

  const subscribeEnabled = checkAccess(
    { userHasUnit: [1000000043, 1000003, 100003] },
    userInfo,
    userUnits
  );

  const chosenEndpoint = isTestProcesses ? endPointTestProcesses : endPoint;
  const hashParams = urlHashParams();
  if (hashParams?.tags && typeof hashParams?.tags === 'string') {
    hashParams.tags = JSON.parse(hashParams.tags);
  }
  const tableData = useTable({ ...chosenEndpoint, autoLoad: true }, { filters: hashParams });

  const {
    data,
    filters: { search }
  } = tableData;

  const exportWorkflow = async (workflow) => {
    const blob = await tableData.actions.exportWorkflow(workflow.id);

    return downloadBase64Attach(
      {
        fileName: `workflow-${workflow.name}-${workflow.id}.bpmn`
      },
      blob
    );
  };

  React.useEffect(() => {
    const fetchData = async () => {
      const result = await requestWorkflows('short=true')(dispatch);
      if (result instanceof Error) return;

      setWorkflows(result);
      const tagsList = await getTagList('short=true')(dispatch);

      if (tagsList instanceof Error) return;
      setTags(tagsList);

      const resizeHandler = () => {
        if (moreTagsRef?.current) {
          Object.keys(moreTagsRef.current).forEach((key) => {
            if (moreTagsRef.current[key]) {
              moreTagsRef.current[key].style.display =
                tagsRef?.current[key]?.scrollHeight > 18 ? 'inline' : 'none';
            }
          });
        }
      };

      setTimeout(() => {
        if (tagsRef?.current) {
          window.addEventListener('resize', resizeHandler, true);
          resizeHandler();
        }
      }, 500);

      return () => {
        window.removeEventListener('resize', resizeHandler, true);
      };
    };

    fetchData();
  }, [dispatch]);

  React.useEffect(() => {
    getFavorites({
      entity: 'workflow_templates'
    })(dispatch);
  }, [dispatch]);

  React.useEffect(() => {
    const fetchData = async () => {
      if (!data) return;

      const users = data.map(({ updatedBy }) => updatedBy).filter(Boolean);

      const results = users.length
        ? await searchUsers(
            {
              ids: users
            },
            '?brief_info=true'
          )(dispatch)
        : [];

      if (results instanceof Error) {
        setData(data);
        return;
      }

      const addNames = data.map((item) => {
        const existedUser = results.find(({ userId }) => item?.updatedBy === userId);

        return {
          updatedByName: existedUser?.name,
          ...item
        };
      });

      setData(addNames);
    };

    fetchData();
  }, [data, dispatch]);

  const selectedRowsData = mappedData.filter(({ id }) => rowsSelected.includes(id));

  const unSubscribed = !selectedRowsData.every(({ errorsSubscribers }) =>
    errorsSubscribers.find(({ id }) => id === userInfo?.userId)
  );

  const startSubscribeProcess = async () => {
    setLoading(true);
    setOpen(false);

    queue.on('end', () => setLoading(false));

    selectedRowsData.forEach((workflow) => {
      const userExists = (workflow?.errorsSubscribers || []).find(
        ({ id }) => id === userInfo?.userId
      );

      queue.push(async () => {
        if (!unSubscribed) {
          if (!userExists) return;
          await unSubscribeToProcess(workflow?.id)(dispatch);
        } else {
          if (userExists) return;
          await subscribeToProcess(workflow?.id)(dispatch);
        }
      });
    });

    queue.push(async () => await tableData.actions.load());
  };

  const OnSelectActions = () => {
    const ItemIcon = () => (unSubscribed ? <NotificationsNoneIcon /> : <NotificationsOffIcon />);

    return (
      <>
        {rowsSelected.length ? (
          <Tooltip
            title={t(unSubscribed ? 'SubscribeProcessTooltip' : 'UnSubscribeProcessTooltip')}
          >
            <IconButton onClick={() => setOpen(true)} size="large">
              {loading ? <CircularProgress size={20} /> : <ItemIcon />}
            </IconButton>
          </Tooltip>
        ) : null}
      </>
    );
  };

  const handleRedirect = (row) => {
    const redirectUrl = `/workflow/${row?.id}`;

    const existKey = SEARCH_KEYS.find((key) => row?.meta[key]);
    const elementID = (row?.meta[existKey] || '').match(/\d{8}/);

    const redirectUrls = {
      matchedDocumentJsonSchema: `${redirectUrl}/task-${elementID}`,
      matchedEventJsonSchema: `${redirectUrl}/event-${elementID}`,
      matchedGatewayJsonSchema: `${redirectUrl}/gateway-${elementID}`,
      matchedTaskJsonSchema: `${redirectUrl}/task-${elementID}`,
      matchedDocumentAdditionalDataToSign: `${redirectUrl}/task-${elementID}`
    };

    history.push(redirectUrls[existKey] || redirectUrl);
  };

  const settings = dataTableSettings({
    t,
    userInfo,
    userUnits,
    readOnly: !isEditable,
    search,
    SEARCH_KEYS,
    subscribeEnabled,
    workflows,
    tags,
    actions: {
      ...tableData.actions,
      onRowsSelect,
      exportWorkflow
    },
    isTestProcesses,
    tagsRef,
    moreTagsRef
  });
  return (
    <LeftSidebarLayout location={location} title={t(title)} loading={tableData.loading}>
      <DataTable
        {...settings}
        {...tableData}
        rowsSelected={rowsSelected}
        actions={{
          ...tableData.actions,
          onRowsSelect,
          exportWorkflow
        }}
        data={mappedData}
        onRowClick={(row) => handleRedirect(row)}
        OnSelectActions={subscribeEnabled ? OnSelectActions : null}
        CustomToolbar={() => (
          <WorkflowTableToolbar
            actions={tableData.actions}
            readOnly={!isEditable}
            path={location.pathname}
            selectedRowsData={selectedRowsData}
            exportWorkflow={exportWorkflow}
          />
        )}
      />

      {subscribeEnabled ? (
        <ConfirmDialog
          open={open}
          title={t(unSubscribed ? 'SubscribePrompt' : 'unSubscribePrompt')}
          description={t(
            unSubscribed ? 'SubscribePropmtDescription' : 'unSubscribePropmtDescription'
          )}
          handleClose={() => setOpen(false)}
          handleConfirm={startSubscribeProcess}
          darkTheme={true}
        />
      ) : null}
    </LeftSidebarLayout>
  );
};

const mapState = ({ auth: { info, userUnits } }) => ({
  userInfo: info,
  userUnits
});

const modulePage = asModulePage(WorkflowListPage);

const connected = connect(mapState)(modulePage);

export default translate('WorkflowListAdminPage')(connected);
