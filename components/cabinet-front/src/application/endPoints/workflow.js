export default {
  dataURL: 'workflows',
  sourceName: 'workflowList',
  composeUrl: () => 'tasks',
  actions: {
    isRowSelectable:
      ({ lastStepLabel }) =>
      () =>
        !lastStepLabel
  }
};
