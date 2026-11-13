interface GetNextVisibleStepArgs {
  removedStepId: string;
  steps: string[];
  previousSteps?: string[] | null;
  template?: { jsonSchema?: { stepOrders?: unknown; properties?: Record<string, unknown> } } | null;
}

const firstSurviving = (candidates: string[], steps: string[]): string | undefined =>
  candidates.find((id) => steps.includes(id));

export default function getNextVisibleStep({
  removedStepId,
  steps,
  previousSteps,
  template
}: GetNextVisibleStepArgs): string | undefined {
  if (!steps?.length) {
    return undefined;
  }

  const previousIndex = previousSteps?.indexOf(removedStepId) ?? -1;
  if (previousSteps && previousIndex !== -1) {
    const found = firstSurviving(previousSteps.slice(previousIndex + 1), steps);
    if (found) {
      return found;
    }
  }

  if (template?.jsonSchema?.stepOrders) {
    return undefined;
  }

  const keys = Object.keys(template?.jsonSchema?.properties || {});
  const keyIndex = keys.indexOf(removedStepId);
  if (keyIndex === -1) {
    return undefined;
  }

  return firstSurviving(keys.slice(keyIndex + 1), steps);
}
