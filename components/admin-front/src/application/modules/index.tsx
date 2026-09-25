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
import fileLibrary from './fileLibrary';

// Not given an explicit return-type annotation on purpose: the consumer
// (`packages/front-core/components/AppRouter/index.tsx`) has its own
// same-shaped-but-nominally-distinct local `RouteModule` interface and
// `.concat()`s this function's result directly against it — naming a
// second, structurally-identical `RouteModule` type here just to annotate
// the return makes TS treat the two as unrelated ("two different types
// with this name exist") and reject the `.concat()`. Casting the literal
// array once at the return site keeps this file's own modules loosely
// typed without needing to share a type declaration across the two files.
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
    fileLibrary,
    debugLogs,
    homeModule
  ] as never[];
};

export default getModules;
