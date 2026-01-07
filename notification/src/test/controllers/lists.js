const common = require('../common');

const server = common.server;
const chai = common.chai;
const checkResponceFormatAndCode = common.checkResponceFormatAndCode;

it('should return request list', (callback) => {
  chai
    .request(server.url)
    .get('/eventsAndTransports')
    .end((err, res) => {
      checkResponceFormatAndCode(err, res, 200);
      callback();
    });
});
