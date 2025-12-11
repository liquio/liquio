let config = require('../config/config'),
  start = require('../app');

let app = start(config);
const chai = require('chai'),
  chaiHttp = require('chai-http');
chai.use(chaiHttp);
const should = chai.should();
console.log(process.env.port);
app.listen(process.env.port || config.conf.port || 80);
let server = app;

export default { server, chai, chaiHttp, should, checkResponceFormatAndCode };

// utils
function checkResponceFormatAndCode(err, res, code) {
  // if (err) {
  //     console.warn(err)
  // }
  res.should.be.json;
  res.should.have.status(code);
}
