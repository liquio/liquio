it('should redirect to idAuthLink with correct parameters when config.idAuthLink and config.clientId are present', () => {
  jest.mock('config.json', () => ({
    idAuthLink: 'https://example.com/auth',
    clientId: 'testClientId'
  }));
  jest.mock('helpers/storage', () => ({
    getItem: jest.fn(() => 'generatedPassword'),
    setItem: jest.fn()
  }));
  jest.mock('password-generator', () => jest.fn(() => 'generatedPassword'));

  const defaultFunction = require('components/Auth/LoginScreen.jsx').default;

  delete window.location;

  window.location = {
    pathname: '/',
    search: '',
    origin: 'https://example.com'
  };

  defaultFunction();

  expect(window.location).toBe(
    'https://example.com/auth?redirect_uri=https://example.com/&client_id=testClientId&state=generatedPassword'
  );
});

it('should redirect to authLink or default link when config.idAuthLink is missing', () => {
  jest.resetModules();

  jest.mock('config.json', () => ({
    authLink: 'https://example.com/redirect/auth'
  }));
  jest.mock('helpers/storage', () => ({
    getItem: jest.fn(() => 'generatedPassword'),
    setItem: jest.fn()
  }));
  jest.mock('password-generator', () => jest.fn(() => 'generatedPassword'));

  const defaultFunction = require('components/Auth/LoginScreen.jsx').default;

  delete window.location;

  window.location = {
    pathname: '/',
    search: '',
    origin: 'https://example.com'
  };

  defaultFunction();

  expect(window.location).toBe('https://example.com/redirect/auth?state=generatedPassword');
});

it('should handle missing config object gracefully', () => {
  jest.resetModules();

  jest.mock('config.json', () => ({}));
  jest.mock('helpers/storage', () => ({
    getItem: jest.fn(() => 'generatedPassword'),
    setItem: jest.fn()
  }));
  jest.mock('password-generator', () => jest.fn(() => 'generatedPassword'));

  const defaultFunction = require('components/Auth/LoginScreen.jsx').default;

  window.location = {
    pathname: '/',
    search: '',
    origin: 'https://example.com'
  };

  defaultFunction();

  expect(window.location).toBe('/redirect/auth?state=generatedPassword');
});
