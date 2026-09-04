import React from 'react';
import { useTranslate } from 'react-translate';
import LeftSidebarLayout from 'layouts/LeftSidebar';

import useFilters from './hooks/useFilters';
import WorkflowDynamicsFilters from './components/WorkflowDynamicsFilters';
import WorkflowDynamicsChart from './components/WorkflowDynamicsChart';

const WorkflowDynamicsPage = ({ location, title }) => {
  const t = useTranslate('WorkflowDynamicsPage');
  const [filters, setFilters] = useFilters();
  const [type, setType] = React.useState('percentage');

  return (
    <LeftSidebarLayout location={location} title={t(title)} flexContent={true}>
      <WorkflowDynamicsFilters
        filters={filters}
        setFilters={setFilters}
        type={type}
        setType={setType}
      />
      <WorkflowDynamicsChart type={type} {...filters} />
    </LeftSidebarLayout>
  );
};

export default WorkflowDynamicsPage;
