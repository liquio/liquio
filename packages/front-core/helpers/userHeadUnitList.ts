interface Unit {
  id: number;
  head?: boolean;
  basedOn?: number[];
  [key: string]: unknown;
}

export default (userUnits: Unit[] = []): Unit[] => {
  const basedOnUnitIds = ([] as number[]).concat(...userUnits.map(({ basedOn }) => basedOn ?? []));

  return (userUnits || []).filter(({ head }) => head).filter(({ id }) => !basedOnUnitIds.includes(id));
};
