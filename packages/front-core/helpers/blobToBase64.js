export default (blob) =>
  new Promise((resolve) => {
    if (!(blob instanceof Blob)) {
      resolve(blob);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => resolve(reader.result);
  });
