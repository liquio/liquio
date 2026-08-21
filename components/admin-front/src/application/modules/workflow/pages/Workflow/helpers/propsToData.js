export default ({
  actualWorkflowList,
  originWorkflowList,
  match: {
    params: { workflowId },
  },
}) => ({
  workflowId,
  workflow: actualWorkflowList[workflowId],
  origin: originWorkflowList[workflowId],
});
