import nock from 'nock';

// nock 15 patches http/fetch globally on import; restore it after each spec file so
// later files running in the same process talk to the in-process app unintercepted.
afterAll(() => {
  nock.cleanAll();
  nock.restore();
});
