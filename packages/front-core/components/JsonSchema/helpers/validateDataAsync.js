import customPassword from 'helpers/customPassword';

export default (pageDataOrigin = {}, schema, documentData = {}) =>
  new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./worker.js', import.meta.url));
    const commandId = customPassword();

    const messageListener = (e) => {
      if (e.data.commandId !== commandId) {
        return;
      }

      const { error, result } = e.data;
      worker.removeEventListener('message', messageListener, true);
      worker.terminate();

      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    };

    worker.addEventListener('message', messageListener, false);
    worker.postMessage(
      JSON.parse(
        JSON.stringify({ commandId, pageDataOrigin, schema, documentData }),
      ),
    );
  });
