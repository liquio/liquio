import crypto from 'node:crypto';
import { AuthorizeModel } from '../models/authorize';
import { appendTraceMeta } from '../lib/async_local_storage';

const Authorize = new AuthorizeModel().Authorize;

function sendAuthError(res: any, code = 'Authorization error', message = 'Authorization empty'): void {
  res.send(401, { code, message });
}

const checkAuth = async function (req: any, res: any, next: any) {
  const { authorization: authConfig = {} } = (global as any).conf;
  const { authorization = '' } = req.headers;

  if (!authorization.trim()) {
    return sendAuthError(res);
  }

  const [authType, authData] = authorization.split(' ');
  if (!authData || authType !== 'Basic') {
    return sendAuthError(res);
  }

  let decodedAuthData;
  try {
    decodedAuthData = Buffer.from(authData, 'base64').toString('utf8');
  } catch {
    return sendAuthError(res, undefined, 'Authorization token not valid');
  }

  const separatorIndex = decodedAuthData.indexOf(':');
  if (separatorIndex === -1) {
    return sendAuthError(res, undefined, 'Authorization token not valid');
  }

  const login = decodedAuthData.slice(0, separatorIndex);
  const pass = decodedAuthData.slice(separatorIndex + 1);
  if (!pass) {
    return sendAuthError(res, undefined, 'Password not match');
  }

  let existedClient;
  if (authConfig.list && Array.isArray(authConfig.list)) {
    existedClient = authConfig.list.find(({ user, password }: any) => user === login && pass === password);
  } else {
    const hmacLogin = crypto.createHmac('sha512', login).update(pass).digest('hex').toUpperCase();
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
const checkTestAuth = async function (req: any, res: any, next: any) {
  // Define params.
  const testAuthToken = req.headers.authorization;
  const conf = (global as any).conf;
  const neededTestAuthToken = conf && conf.testService && conf.testService.token;

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
const credentials: any = {
  realm: 'Digest Authenticatoin',
};

//4.

function cryptoUsingMD5(data: any) {
  return crypto.createHash('md5').update(data).digest('hex');
}

//5.
const hash: any = cryptoUsingMD5(credentials.realm);

//7.
function parseAuthenticationInfo(authData: any): any {
  const authenticationObj: any = {};
  authData.split(', ').forEach(function (d: any) {
    d = d.split('=');

    authenticationObj[d[0]] = d[1].replace(/"/g, '');
  });
  return authenticationObj;
}

//8.
async function login(request: any, res: any) {
  let authInfo;
  const digestAuthObject: any = {};

  //9.
  if (!request.headers.authorization) {
    res.header('WWW-Authenticate', 'Digest realm="' + credentials.realm + '",qop="auth",nonce="' + Math.random() + '",opaque="' + hash + '"');
    return sendAuthError(res);
  }

  //10.
  authInfo = request.headers.authorization.replace(/^Digest /, '');
  authInfo = parseAuthenticationInfo(authInfo);

  //11.
  const client = await Authorize.findOne({ where: { login: authInfo.username } });
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
  const resp = cryptoUsingMD5([digestAuthObject.ha1, authInfo.nonce, authInfo.nc, authInfo.cnonce, authInfo.qop, digestAuthObject.ha2].join(':'));

  digestAuthObject.response = resp;

  //15.
  if (authInfo.response !== digestAuthObject.response) {
    res.header('WWW-Authenticate', 'Digest realm="' + credentials.realm + '",qop="auth",nonce="' + Math.random() + '",opaque="' + hash + '"');
    return sendAuthError(res, undefined, 'Not valid password');
  }

  appendTraceMeta({ login });
  return true;
}
const checkConfigAuth = async function (req: any, res: any, next: any) {
  if (await login(req, res)) next();
};

export { checkAuth, checkTestAuth, checkConfigAuth };
