interface PropsToDataParams {
  actualWorkflowList: Record<string, unknown>;
  originWorkflowList: Record<string, unknown>;
  match: {
    params: { workflowId: string };
  };
}

export default ({
  actualWorkflowList,
  originWorkflowList,
  match: {
    params: { workflowId },
  },
}: PropsToDataParams) => ({
  workflowId,
  workflow: actualWorkflowList[workflowId],
  origin: originWorkflowList[workflowId],
});
