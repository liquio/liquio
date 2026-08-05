import ReportListPage from './pages/ReportList';
import ReportTemplatesPage from './pages/ReportTemplates';
import { getConfig } from 'core/helpers/configLoader';

export default function getReportsModule() {
  const { reports: { enabled } = {} } = getConfig();

  const access = {
    userHasUnit: [1000002, 1000000042]
  };

  return enabled
    ? {
        routes: [
          {
            path: '/reports',
            title: 'Reports',
            component: ReportListPage,
            access
          },
          {
            path: '/reports/templates',
            title: 'ReportTemplates',
            component: ReportTemplatesPage,
            access
          }
        ],
        navigation: []
      }
    : {};
}
