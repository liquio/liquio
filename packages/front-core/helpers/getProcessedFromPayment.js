export default (value) => {
  return value?.processed?.some((v) => v?.status?.isSuccess === 1) || false;
};
