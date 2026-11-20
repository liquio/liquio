import type { DataTableEndpoint } from 'core/services/dataTable/types';

export default {
  dataURL: 'workflows',
  sourceName: 'workflowList',
  composeUrl: () => 'tasks',
  actions: {
    isRowSelectable:
      ({ lastStepLabel }: { lastStepLabel?: unknown }) =>
      () =>
        !lastStepLabel
  }
} satisfies DataTableEndpoint;
