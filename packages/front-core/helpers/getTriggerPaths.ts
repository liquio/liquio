interface TriggerLike {
  readOnly?: unknown;
  target?: unknown;
  [key: string]: unknown;
}

interface DeltaPropertyLike {
  path: string;
  [key: string]: unknown;
}

const PLACEHOLDER_REGEXP = /^\$\{.+?}$/;

const targetMatchesPath = (targetTemplate: string, path: string): boolean => {
  if (!targetTemplate || !path) {
    return false;
  }

  const targetSegments = targetTemplate.split('.');
  const pathSegments = path.split('.');

  if (pathSegments.length < targetSegments.length) {
    return false;
  }

  for (let i = 0; i < targetSegments.length; i++) {
    const targetSegment = targetSegments[i];

    if (PLACEHOLDER_REGEXP.test(targetSegment)) {
      continue;
    }

    if (targetSegment !== pathSegments[i]) {
      return false;
    }
  }

  return true;
};

const getTriggerPaths = (calcTriggers: unknown, properties: unknown): string[] => {
  if (!Array.isArray(calcTriggers) || !Array.isArray(properties)) {
    return [];
  }

  const readOnlyTargets: string[] = [];
  (calcTriggers as Array<TriggerLike | null | undefined>).forEach((trigger) => {
    if (trigger && trigger.readOnly === true && trigger.target) {
      ([] as string[]).concat(trigger.target as string | string[]).forEach((target) => {
        readOnlyTargets.push(target);
      });
    }
  });

  if (!readOnlyTargets.length) {
    return [];
  }

  const matched = (properties as DeltaPropertyLike[])
    .map(({ path }) => path)
    .filter((path) => readOnlyTargets.some((target) => targetMatchesPath(target, path)));

  return [...new Set(matched)];
};

export default getTriggerPaths;
