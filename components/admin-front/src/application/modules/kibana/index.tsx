import { getConfig } from 'core/helpers/configLoader';
import KibanaReportListPage from './pages/KibanaReportList';
import KibanaEmbedPage from './pages/KibanaEmbed';

interface RouteDef {
  path: string;
  component: unknown;
  title: string;
  access?: Record<string, unknown>;
  [key: string]: unknown;
}

interface KibanaModule {
  routes: RouteDef[];
  navigation: unknown[];
  [key: string]: unknown;
}

export default function getKibanaModule(): KibanaModule {
  const { kibanaEmbed } = getConfig();

  const routes: RouteDef[] = [];
  const navigation: unknown[] = [];

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
