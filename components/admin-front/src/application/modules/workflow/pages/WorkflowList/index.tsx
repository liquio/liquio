import React from 'react';
import { translate } from 'react-translate';
import { connect, useDispatch } from 'react-redux';
import { IconButton, Tooltip, CircularProgress } from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';

import queueFactory from 'helpers/queueFactory';
import LeftSidebarLayoutRaw from 'layouts/LeftSidebar';
import DataTableRaw from 'components/DataTable';
import ConfirmDialogRaw from 'components/ConfirmDialog';
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
import WorkflowTableToolbarRaw from './components/WorkflowTableToolbar';

const LeftSidebarLayout = LeftSidebarLayoutRaw as unknown as React.ComponentType<Record<string, unknown>>;
const DataTable = DataTableRaw as unknown as React.ComponentType<Record<string, unknown>>;
const ConfirmDialog = ConfirmDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;
const WorkflowTableToolbar = WorkflowTableToolbarRaw as unknown as React.ComponentType<Record<string, unknown>>;

const SEARCH_KEYS = [
  'matchedDocumentJsonSchema',
  'matchedEventJsonSchema',
  'matchedGatewayJsonSchema',
  'matchedTaskJsonSchema',
  'matchedDocumentAdditionalDataToSign'
];

interface Tag {
  id?: string | number;
  name?: string;
  color?: string;
}

interface WorkflowRow {
  id: string | number;
  name?: string;
  meta?: Record<string, string>;
  tags?: Tag[];
  updatedBy?: string | number;
  updatedByName?: string;
  errorsSubscribers?: { id?: string | number }[];
  [key: string]: unknown;
}

interface Unit {
  id: number;
  [key: string]: unknown;
}

interface UserInfo {
  userId?: string | number;
  [key: string]: unknown;
}

interface WorkflowListPageProps {
  t: (key: string) => string;
  history: { push: (url: string) => void };
  location: { pathname: string };
  title: string;
  userInfo: UserInfo;
  userUnits: Unit[];
  isTestProcesses?: boolean;
}

const WorkflowListPage = ({
  t,
  history,
  location,
  title,
  userInfo,
  userUnits,
  isTestProcesses
}: WorkflowListPageProps) => {
  const [mappedData, setData] = React.useState<WorkflowRow[]>([]);
  const [rowsSelected, onRowsSelect] = React.useState<Array<string | number>>([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [workflows, setWorkflows] = React.useState<{ id?: string | number; name?: string }[]>([]);
  const [tags, setTags] = React.useState<Tag[]>([]);
  const tagsRef = React.useRef<Record<string, HTMLElement | null>>({});
  const moreTagsRef = React.useRef<Record<string, HTMLElement | null>>({});

  const dispatch = useDispatch();

  const queue = React.useMemo(() => queueFactory.get('subscribeQueue'), []);

  const isEditable = checkAccess({ userHasUnit: [1000002] }, userInfo, userUnits as never);

  const subscribeEnabled = checkAccess(
    { userHasUnit: [1000000043, 1000003, 100003] },
    userInfo,
    userUnits as never
  );

  const chosenEndpoint = isTestProcesses ? endPointTestProcesses : endPoint;
  const hashParams = urlHashParams() as { tags?: string | unknown[] };
  if (hashParams?.tags && typeof hashParams?.tags === 'string') {
    hashParams.tags = JSON.parse(hashParams.tags);
  }
  const tableData = useTable({ ...chosenEndpoint, autoLoad: true } as never, { filters: hashParams } as never) as unknown as {
    data: WorkflowRow[];
    filters: { search?: string };
    loading: boolean;
    actions: {
      exportWorkflow: (id: string | number) => Promise<string>;
      load: () => void;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };

  const {
    data,
    filters: { search }
  } = tableData;

  const exportWorkflow = async (workflow: WorkflowRow) => {
    const blob = await tableData.actions.exportWorkflow(workflow.id);

    return downloadBase64Attach(
      {
        fileName: `workflow-${workflow.name}-${workflow.id}.bpmn`
      },
      blob
    );
  };

  React.useEffect(() => {
    let cleanup: (() => void) | undefined;

    const fetchData = async () => {
      const result = (await requestWorkflows('short=true')(dispatch as never)) as WorkflowRow[] | Error;
      if (result instanceof Error) return;

      setWorkflows(result);
      const tagsList = (await getTagList('short=true')(dispatch as never)) as Tag[] | Error;

      if (tagsList instanceof Error) return;
      setTags(tagsList);

      const resizeHandler = () => {
        if (moreTagsRef?.current) {
          Object.keys(moreTagsRef.current).forEach((key) => {
            if (moreTagsRef.current[key]) {
              (moreTagsRef.current[key] as HTMLElement).style.display =
                (tagsRef?.current[key]?.scrollHeight as number) > 18 ? 'inline' : 'none';
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

      cleanup = () => {
        window.removeEventListener('resize', resizeHandler, true);
      };
    };

    fetchData();

    return () => cleanup?.();
  }, [dispatch]);

  React.useEffect(() => {
    getFavorites({
      entity: 'workflow_templates'
    })(dispatch as never);
  }, [dispatch]);

  React.useEffect(() => {
    const fetchData = async () => {
      if (!data) return;

      const users = data.map(({ updatedBy }) => updatedBy).filter(Boolean);

      const results = (users.length
        ? await searchUsers(
            {
              ids: users
            },
            '?brief_info=true'
          )(dispatch as never)
        : []) as { userId?: string | number; name?: string }[] | Error;

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
    (errorsSubscribers || []).find(({ id }) => id === userInfo?.userId)
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
          await unSubscribeToProcess(workflow?.id)(dispatch as never);
        } else {
          if (userExists) return;
          await subscribeToProcess(workflow?.id)(dispatch as never);
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

  const handleRedirect = (row: WorkflowRow) => {
    const redirectUrl = `/workflow/${row?.id}`;

    const existKey = SEARCH_KEYS.find((key) => row?.meta?.[key]);
    const elementID = ((existKey && row?.meta?.[existKey]) || '').match(/\d{8}/);

    const redirectUrls: Record<string, string> = {
      matchedDocumentJsonSchema: `${redirectUrl}/task-${elementID}`,
      matchedEventJsonSchema: `${redirectUrl}/event-${elementID}`,
      matchedGatewayJsonSchema: `${redirectUrl}/gateway-${elementID}`,
      matchedTaskJsonSchema: `${redirectUrl}/task-${elementID}`,
      matchedDocumentAdditionalDataToSign: `${redirectUrl}/task-${elementID}`
    };

    history.push((existKey && redirectUrls[existKey]) || redirectUrl);
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
  } as never);
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
        onRowClick={(row: WorkflowRow) => handleRedirect(row)}
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

interface ConnectedState {
  auth: { info: UserInfo; userUnits: Unit[] };
}

const mapState = ({ auth: { info, userUnits } }: ConnectedState) => ({
  userInfo: info,
  userUnits
});

const modulePage = asModulePage(WorkflowListPage as never);

const connected = connect(mapState)(modulePage as never);

export default translate('WorkflowListAdminPage')(connected as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
