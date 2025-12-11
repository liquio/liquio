import React from 'react';
import { useDispatch } from 'react-redux';
import { translate } from 'react-translate';
import { NavLink } from 'react-router-dom';
import * as api from 'services/api';
import NavItemContent from 'layouts/components/Navigator/NavItemContent';

const NavigationList = ({ t }) => {
  const dispatch = useDispatch();
  const [reports, setReports] = React.useState();

  const updateReportList = React.useCallback(async () => {
    try {
      const results = await api.get(
        'proxy-items',
        'REQUEST_REPORT_LIST',
        dispatch,
      );
      setReports(results);
    } catch (e) {}
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

export default translate('KibanaReports')(NavigationList);
