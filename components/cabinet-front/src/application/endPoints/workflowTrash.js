export default {
  dataURL: 'workflows',
  sourceName: 'workflowTrashList',
  composeUrl: () => 'tasks',
  actions: {
    isRowSelectable:
      ({ lastStepLabel }) =>
      () =>
        !lastStepLabel
  }
};
