import React from 'react';
import { useDispatch } from 'react-redux';

import Preloader from 'components/Preloader';
import LeftSidebarLayout from 'layouts/LeftSidebar';
import asModulePage from 'hooks/asModulePage';
import * as api from 'services/api';

interface KibanaReportData {
  data?: { link?: string };
}

interface KibanaEmbedPageProps {
  reportId: string;
}

const KibanaEmbedPage = ({ reportId }: KibanaEmbedPageProps) => {
  const dispatch = useDispatch();
  const [report, setReport] = React.useState<KibanaReportData>();

  const requestReport = React.useCallback(async () => {
    const result = (await api.get(`proxy-items/${reportId}`, 'REQUEST_KIBANA_REPORT', dispatch)) as KibanaReportData;
    setReport(result);
  }, [dispatch, reportId]);

  React.useEffect(() => {
    requestReport();
  }, [requestReport]);

  return report ? (
    <LeftSidebarLayout noTitle={true}>
      <iframe title="kibana" src={report?.data?.link} style={{ border: 'none', height: '100%' }} />
    </LeftSidebarLayout>
  ) : (
    <Preloader flex={true} />
  );
};

export default asModulePage(KibanaEmbedPage as never);
