import store from 'store';

interface UnitLike {
  id: number;
  [key: string]: unknown;
}

const userIsResident = (): boolean => {
  const state = store.getState() as { auth?: { units?: UnitLike[] } } | undefined;
  const units = state?.auth?.units || [];

  return units.some((unit) => unit.id === 1000770);
};

export default userIsResident;
