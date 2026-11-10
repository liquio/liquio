import nock from 'nock';

// nock activates on import and patches the shared `http` module of the Jest worker.
// Specs that import it without TestApp.afterAll must not leave the patch active for the next file.
afterAll(() => {
  nock.restore();
});
