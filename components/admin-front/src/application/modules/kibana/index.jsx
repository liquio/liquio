import { getConfig } from 'core/helpers/configLoader';
import KibanaReportListPage from './pages/KibanaReportList';
import KibanaEmbedPage from './pages/KibanaEmbed';

export default function getKibanaModule() {
  const { kibanaEmbed } = getConfig();

  const routes = [];
  const navigation = [];

  if (kibanaEmbed) {
    routes.push({
      path: '/kibana',
      component: KibanaReportListPage,
      title: 'KibanaReportList',
      access: { userHasUnit: [1000002, 1000000042] }
    });

    routes.push({
      path: '/kibana/:reportId',
      component: KibanaEmbedPage,
      title: 'KibanaTitle',
      access: { userHasUnit: [1000002, 1000000042] }
    });
  }

  return { routes, navigation };
}
