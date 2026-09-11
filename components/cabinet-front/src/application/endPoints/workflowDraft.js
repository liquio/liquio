export default {
  dataURL: 'workflows',
  sourceName: 'workflowDraftList',
  composeUrl: () => 'tasks',
  actions: {
    isRowSelectable:
      ({ lastStepLabel }) =>
      () =>
        !lastStepLabel
  }
};
