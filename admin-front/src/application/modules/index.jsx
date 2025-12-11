import profileModule from 'core/modules/profile';
import homeModule from './home';
import settingsModule from './settings';
import getWorkflowModule from './workflow';
import getUsersModule from './users';
import registryModule from './registry';
import processesModule from './processes';
import healthCheckModule from './healthCheck';
import getEnableUIFilters from './ui';
import getKibanaModule from './kibana';
import elasticModule from './elastic';
import getReportsModule from './reports';
import getEnableMockModules from './mocks';
import getCustomInterfaces from './customInterfaces';
import getMetricsModule from './metrics';
import processStatistic from './processStatistics';
import favorites from './favorites';
import debugLogs from './debugLogs';
import multiLang from './multiLang';

const getModules = () => {
  return [
    favorites,
    profileModule,
    settingsModule,
    getWorkflowModule(),
    getUsersModule(),
    registryModule,
    getEnableUIFilters(),
    getCustomInterfaces(),
    getKibanaModule(),
    elasticModule,
    getReportsModule(),
    processesModule,
    healthCheckModule,
    getEnableMockModules(),
    getMetricsModule(),
    multiLang,
    processStatistic,
    debugLogs,
    homeModule
  ];
};

export default getModules;
