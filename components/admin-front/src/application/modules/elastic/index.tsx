import ElasticMonitoring from './pages/Monitoring';

interface RouteDef {
  path: string;
  component: unknown;
  title: string;
  access?: Record<string, unknown>;
  [key: string]: unknown;
}

interface ElasticModule {
  routes: RouteDef[];
  navigation: unknown[];
  [key: string]: unknown;
}

const access = { userHasUnit: [1000012] };

const elasticModule: ElasticModule = {
  routes: [
    {
      path: '/elastic/monitoring',
      component: ElasticMonitoring,
      title: 'elasticSettings',
      access
    }
  ],
  navigation: []
};

export default elasticModule;
