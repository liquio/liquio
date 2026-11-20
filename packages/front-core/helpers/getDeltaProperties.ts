import diff from 'helpers/diff';

interface DeltaProperty {
  path: string;
  value: unknown;
  previousValue: unknown;
}

export default (claim: unknown, origin: unknown): DeltaProperty[] =>
  (diff(origin, claim) || [])
    .map((props): DeltaProperty => {
      const { path = [], lhs, rhs, kind, index, item } = props;
      if (kind === 'A' && item) {
        return {
          path: path.concat([index as number]).join('.'),
          value: item.rhs,
          previousValue: item.lhs ?? undefined
        };
      }

      return {
        path: path.join('.'),
        value: rhs,
        previousValue: lhs ?? undefined
      };
    })
    .filter(({ path }) => path)
    .filter(({ value, previousValue }) => value !== previousValue);
