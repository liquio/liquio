import MockList from 'application/modules/mocks/pages/MockList';
import { getConfig } from 'core/helpers/configLoader';

export default function getEnableMockModules() {
  const config = getConfig();

  let enableMockModules = {
    routes: [
      {
        path: '/individual_mock',
        component: MockList,
        title: 'EnabledMockListTitle',
        access: {
          userHasUnit: [1000016, 10000160]
        }
      }
    ]
  };

  if (!config?.enabledMocksPage) {
    enableMockModules = {};
  }

  return enableMockModules;
}
