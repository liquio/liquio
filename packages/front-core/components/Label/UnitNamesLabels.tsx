import { useAppSelector } from 'core/store/hooks';
import type { AuthUnit } from 'core/types/authState';

interface UnitNamesLabelsProps {
  units?: AuthUnit['id'][];
}

export default function UnitNamesLabels({ units = [] }: UnitNamesLabelsProps) {
  const unitList = useAppSelector((state) => state.auth.units);
  return (
    <>
      {(unitList || [])
        .filter(({ id }) => units.includes(id))
        .map(({ name }) => name)
        .join(', ')}
    </>
  );
}
