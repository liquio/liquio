const AuthorizeModel = require('../models/authorize');
const Authorize = new AuthorizeModel().Authorize;
const crypto = require('crypto');
const { appendTraceMeta } = require('../lib/async_local_storage');

function sendAuthError(res, code = 'Authorization error', message = 'Authorization empty') {
  res.send(401, { code, message });
}

const checkAuth = async function (req, res, next) {
  const { authorization: authConfig = {} } = global.conf;
  const { authorization = '' } = req.headers;

  if (!authorization.trim()) {
    return sendAuthError(res);
  }

  const [authType, authData] = authorization.split(' ');
  if (!authData || authType !== 'Basic') {
    return sendAuthError(res);
  }

  const [login, pass] = authData.split(':');
  if (!pass) {
    return sendAuthError(res, undefined, 'Password not match');
  }

  const hmacLogin = crypto.createHmac('sha512', login).update(pass).digest('hex').toUpperCase();

  let existedClient;
  if (authConfig.list && Array.isArray(authConfig.list)) {
    existedClient = authConfig.list.find(({ user, password }) => user === hmacLogin && pass === password);
  } else {
    existedClient = await Authorize.findOne({ where: { login: hmacLogin, password: pass } });
  }

  if (!existedClient) {
    return sendAuthError(res, undefined, 'User not match');
  }

  next();
};

/**
 * Check test auth.
 * @param {object} req HTTP request.
 * @param {object} res HTTP response.
 * @param {object} next Next handler.
 */
const checkTestAuth = async function (req, res, next) {
  // Define params.
  const testAuthToken = req.headers.authorization;
  const neededTestAuthToken = global.conf && global.conf.testService && global.conf.testService.token;

  // Check.
  if (!neededTestAuthToken) {
    return sendAuthError(res, undefined, 'Test auth token not defined in config.');
  }
  if (testAuthToken !== neededTestAuthToken) {
    return sendAuthError(res, undefined, 'Test auth token not match.');
  }

  // Go to next handler.
  next();
};

//3.
let credentials = {
  realm: 'Digest Authenticatoin',
};

//3a.
let hash;

//4.

function cryptoUsingMD5(data) {
  return crypto.createHash('md5').update(data).digest('hex');
}

//5.
hash = cryptoUsingMD5(credentials.realm);

//7.
function parseAuthenticationInfo(authData) {
  let authenticationObj = {};
  authData.split(', ').forEach(function (d) {
    d = d.split('=');

    authenticationObj[d[0]] = d[1].replace(/"/g, '');
  });
  return authenticationObj;
}

//8.
async function login(request, res) {
  let authInfo,
    digestAuthObject = {};

  //9.
  if (!request.headers.authorization) {
    res.header('WWW-Authenticate', 'Digest realm="' + credentials.realm + '",qop="auth",nonce="' + Math.random() + '",opaque="' + hash + '"');
    return sendAuthError(res);
  }

  //10.
  authInfo = request.headers.authorization.replace(/^Digest /, '');
  authInfo = parseAuthenticationInfo(authInfo);

  //11.
  let client = await Authorize.findOne({ where: { login: authInfo.username } });
  if (!client) {
    res.header('WWW-Authenticate', 'Digest realm="' + credentials.realm + '",qop="auth",nonce="' + Math.random() + '",opaque="' + hash + '"');
    return sendAuthError(res, undefined, 'Not valid login');
  } else {
    credentials.userName = client.login;

    credentials.password = client.password;
  }

  //12.
  digestAuthObject.ha1 = cryptoUsingMD5(authInfo.username + ':' + credentials.realm + ':' + credentials.password);

  //13.
  digestAuthObject.ha2 = cryptoUsingMD5(request.method + ':' + authInfo.uri);

  //14.
  let resp = cryptoUsingMD5([digestAuthObject.ha1, authInfo.nonce, authInfo.nc, authInfo.cnonce, authInfo.qop, digestAuthObject.ha2].join(':'));

  digestAuthObject.response = resp;

  //15.
  if (authInfo.response !== digestAuthObject.response) {
    res.header('WWW-Authenticate', 'Digest realm="' + credentials.realm + '",qop="auth",nonce="' + Math.random() + '",opaque="' + hash + '"');
    return sendAuthError(res, undefined, 'Not valid password');
  }

  appendTraceMeta({ login });
  return true;
}
const checkConfigAuth = async function (req, res, next) {
  if (await login(req, res)) next();
};

module.exports = { checkAuth, checkTestAuth, checkConfigAuth };
