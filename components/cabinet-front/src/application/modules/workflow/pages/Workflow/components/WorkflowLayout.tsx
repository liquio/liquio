import React, { Suspense } from 'react';
import { useTranslate } from 'react-translate';
import { Typography } from '@mui/material';
import { makeStyles } from '@mui/styles';

import LeftSidebarLayoutRaw, { Content } from 'layouts/LeftSidebar';
import PreloaderRaw from 'components/Preloader';
import HeaderRaw from 'modules/workflow/pages/Workflow/components/Header';
import BlockScreenRaw from 'components/BlockScreenReforged';

const LeftSidebarLayout = LeftSidebarLayoutRaw as unknown as React.ComponentType<Record<string, unknown>>;
const Preloader = PreloaderRaw as unknown as React.ComponentType<Record<string, unknown>>;
const Header = HeaderRaw as unknown as React.ComponentType<Record<string, unknown>>;
const BlockScreen = BlockScreenRaw as unknown as React.ComponentType<Record<string, unknown>>;

const FileDataTable = React.lazy(() => import('components/FileDataTable'));

const useStyles = makeStyles(() => ({
  description: {
    fontSize: 22,
    lineHeight: '28px',
    marginBottom: 24,
    maxWidth: 776
  }
}));

interface WorkflowTimelineEntry {
  description?: string;
  [key: string]: unknown;
}

interface WorkflowData {
  timeline?: WorkflowTimelineEntry[];
  files?: unknown[];
  [key: string]: unknown;
}

interface WorkflowLayoutProps {
  location: { pathname: string };
  title: string;
  actions: Record<string, unknown>;
  loading?: boolean;
  debugTools?: Record<string, unknown>;
  // Preserved as-is: `defaultProps.workflow = null`, but the code below
  // reads `workflow.timeline`/`workflow.files` without optional chaining —
  // a pre-existing crash risk if `workflow` is ever actually null while
  // `loading` is false. Not observed to happen in practice; not "fixed"
  // here since that would change behavior.
  workflow?: WorkflowData | null;
  fileStorage?: Record<string, unknown>;
}

const WorkflowLayout = ({
  location,
  title,
  actions,
  loading = false,
  debugTools = {},
  workflow = null,
  fileStorage = {}
}: WorkflowLayoutProps) => {
  const classes = useStyles();
  const t = useTranslate('BreadCrumbs');

  const getCrumbsTitle = React.useCallback(() => {
    const { pathname } = location;
    let label = '';
    let link = '';

    switch (true) {
      case pathname.includes('/workflow'):
        label = t('WorkflowListTitle');
        link = '/workflow';
        break;
      default:
        break;
    }

    return { label, link };
  }, [t, location]);

  const breadcrumbs = React.useMemo(() => {
    const { label, link } = getCrumbsTitle();

    return [
      {
        label,
        link
      },
      {
        label: title
      }
    ];
  }, [title, getCrumbsTitle]);

  return (
    <LeftSidebarLayout
      location={location}
      title={title}
      loading={loading}
      debugTools={debugTools}
      breadcrumbs={breadcrumbs}
    >
      {loading ? (
        <Preloader />
      ) : (
        <>
          <Header workflow={workflow} timeline={(workflow as WorkflowData).timeline || []} />
          <Content>
            {(workflow as WorkflowData).timeline && (workflow as WorkflowData).timeline?.length ? (
              <Typography className={classes.description}>
                {(workflow as WorkflowData).timeline?.[(workflow as WorkflowData).timeline!.length - 1].description}
              </Typography>
            ) : null}
            <Suspense fallback={<BlockScreen dataGrid={true} />}>
              <FileDataTable
                data={(workflow as WorkflowData).files}
                fileStorage={fileStorage}
                actions={actions}
                withPrint={true}
              />
            </Suspense>
          </Content>
        </>
      )}
    </LeftSidebarLayout>
  );
};

export default WorkflowLayout;
