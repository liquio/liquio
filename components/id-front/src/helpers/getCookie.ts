const getCookie = (name: string): string | undefined => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);

  if (parts.length === 2) {
    return (parts.pop() as string).split(';').shift();
  }

  return undefined;
};

export default getCookie;
