const common = require('../common');

const server = common.server;
const should = common.should;
const chai = common.chai;
const checkResponceFormatAndCode = common.checkResponceFormatAndCode;

it('should return 401 user subscribes list', (callback) => {
  chai
    .request(server.url)
    .get('/userSubscribes')
    .query({ access_token: 'invalid_login' })
    .end((err, res) => {
      checkResponceFormatAndCode(err, res, 401);
      chai.expect(err).to.be.not.null;
      callback();
    });
});
