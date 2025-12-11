import diff from 'helpers/diff';
// import isEmpty from 'helpers/isEmpty';

export default (claim, origin) =>
  (diff(origin, claim) || [])
    .map((props) => {
      const { path, lhs, rhs, kind, index, item } = props;
      if (kind === 'A') {
        return {
          path: path.concat([index]).join('.'),
          value: item.rhs,
          previousValue: item.lhs ?? undefined,
        };
      }

      return {
        path: path.join('.'),
        value: rhs,
        previousValue: lhs ?? undefined,
      };
    })
    .filter(({ path }) => path)
    .filter(({ value, previousValue }) => value !== previousValue);
// .filter(({ value, previousValue }) => !(isEmpty(value) && isEmpty(previousValue)));
