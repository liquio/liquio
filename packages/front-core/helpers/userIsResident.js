import store from 'store';

const userIsResident = () => {
  const units = store.getState()?.auth?.units || [];

  const isResident = units.some((unit) => unit.id === 1000770);

  return isResident;
};

export default userIsResident;
