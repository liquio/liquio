import React, { Suspense } from 'react';
import PropTypes from 'prop-types';
import { useTranslate } from 'react-translate';
import { Typography } from '@mui/material';
import { makeStyles } from '@mui/styles';

import LeftSidebarLayout, { Content } from 'layouts/LeftSidebar';
import Preloader from 'components/Preloader';
import Header from 'modules/workflow/pages/Workflow/components/Header';
import BlockScreen from 'components/BlockScreenReforged';

const FileDataTable = React.lazy(() => import('components/FileDataTable'));

const useStyles = makeStyles(() => ({
  description: {
    fontSize: 22,
    lineHeight: '28px',
    marginBottom: 24,
    maxWidth: 776
  }
}));

const WorkflowLayout = ({
  location,
  title,
  actions,
  loading,
  debugTools,
  workflow,
  fileStorage
}) => {
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
          <Header workflow={workflow} timeline={workflow.timeline || []} />
          <Content>
            {workflow.timeline && workflow.timeline.length ? (
              <Typography className={classes.description}>
                {workflow.timeline[workflow.timeline.length - 1].description}
              </Typography>
            ) : null}
            <Suspense fallback={<BlockScreen dataGrid={true} />}>
              <FileDataTable
                data={workflow.files}
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

WorkflowLayout.propTypes = {
  location: PropTypes.object.isRequired,
  title: PropTypes.string.isRequired,
  actions: PropTypes.object.isRequired,
  loading: PropTypes.bool,
  debugTools: PropTypes.object,
  workflow: PropTypes.object,
  fileStorage: PropTypes.object
};

WorkflowLayout.defaultProps = {
  loading: false,
  debugTools: {},
  workflow: null,
  fileStorage: {}
};

export default WorkflowLayout;
