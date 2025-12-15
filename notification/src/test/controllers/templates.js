const common = require('../common');

const server = common.server;
const chai = common.chai;
const checkResponceFormatAndCode = common.checkResponceFormatAndCode;

it('prepare message', (callback) => {
  chai
    .request(server.url)
    .post('/prepareMessageByTemplateId')
    .send({
      template_id: 3,
      params: {
        name: 'sdgsdg',
        code: '1124',
      },
    })
    .end((err, res) => {
      checkResponceFormatAndCode(err, res, 200);
      callback();
    });
});
