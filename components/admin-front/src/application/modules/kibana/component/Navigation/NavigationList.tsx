import React from 'react';
import { useDispatch } from 'react-redux';
import { translate } from 'react-translate';
import { NavLink } from 'react-router-dom';
import * as api from 'services/api';
import NavItemContent from 'layouts/components/Navigator/NavItemContent';

interface KibanaReport {
  id: string;
  [key: string]: unknown;
}

interface NavigationListProps {
  t: (key: string) => string;
}

const NavigationList = ({ t }: NavigationListProps) => {
  const dispatch = useDispatch();
  const [reports, setReports] = React.useState<KibanaReport[]>();

  const updateReportList = React.useCallback(async () => {
    try {
      const results = (await api.get(
        'proxy-items',
        'REQUEST_REPORT_LIST',
        dispatch,
      )) as KibanaReport[];
      setReports(results);
    } catch (e) {
      // no-op, matches original empty catch
    }
  }, [dispatch]);

  React.useEffect(() => {
    updateReportList();
  }, [updateReportList]);

  return (
    <>
      {reports
        ? reports.map((report) => (
            <NavLink
              to={'/kibana/' + report.id}
              key={report.id}
              id={report.id}
              style={{
                textDecoration: 'none',
              }}
            >
              <NavItemContent {...report} t={t} childItem={true} />
            </NavLink>
          ))
        : null}
    </>
  );
};

export default translate('KibanaReports')(NavigationList as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
