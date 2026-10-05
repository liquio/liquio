# Liquio Test Suite

This directory contains Playwright end-to-end tests for the Liquio application.

## Prerequisites

Before running the tests, ensure the following:

1. **Install dependencies**: Run `npm install` in this directory to install Playwright and other required packages.

2. **Initialize the environment**: Make sure the Liquio environment is set up by running the initialization script:
   ```bash
   # From the project root
   ./scripts/init.sh
   ```

3. **Start Docker services**: Ensure Docker Compose is running to start all necessary services:
   ```bash
   # From the project root
   docker compose up -d
   ```

## Running Tests

### Headless Mode (Default)
Run all tests in headless mode (no browser UI):
```bash
npm run test
```

### Headed Mode (With Browser UI)
Run all tests with visible browser windows for debugging:
```bash
npm run test:headed
```

### Running Specific Tests
You can run individual test files or filter by test name:
```bash
# Run a specific test file
npx playwright test basic-workflow.spec.js

# Run tests matching a pattern
npx playwright test --grep "admin authorization"

# Run in headed mode with grep
npx playwright test --headed --grep "admin authorization"
```

### LDAP login (`ldap.spec.js`)

`ldap.spec.js` covers the LDAP login (API and UI in one file). It needs an OpenLDAP container and the `ldap` provider enabled in id-api, which the default stack does not have. Without them the whole file is skipped (it checks `GET http://localhost:8100/auth_providers`).

Start the LDAP stack from the project root (the override file adds an `openldap` service and merges `fixtures/ldap/id/config.json` over the id-api config through `SECRET_PATH`):
```bash
docker compose -f docker-compose.yml -f test/fixtures/ldap/docker-compose.ldap.yml up -d openldap id-api
cd test && npx playwright test ldap.spec.js
```
The spec loads the memberOf overlay and the users and groups from `fixtures/ldap/*.ldif` on the first run. It changes group membership with `docker compose exec openldap ldapmodify` and calls `POST /user/ldap/sync/:userId` of id-api with the Basic credentials from `config/id/config.json`. To get back to the default stack, run `docker compose up -d --force-recreate id-api`.

## Test Structure

- `basic-workflow.spec.js`: End-to-end workflow tests including register/workflow imports and task completion
- `test-helpers.js`: Shared utility functions for common test operations

## Debugging

The tests use the `debug` package for structured logging with namespaces prefixed by `test:`.

- For detailed logging, set the `DEBUG` environment variable to `test:log`:
  ```bash
  DEBUG=test:log npm run test:headed
  ```

- For highest verbosity (all debug messages), use `DEBUG=test:*` to enable all namespaces starting with `test:`:
  ```bash
  DEBUG=test:* npm run test:headed
  ```
  This will show debug output from all test helper functions and operations, providing the most comprehensive logging for troubleshooting.

- Tests run with request/response logging enabled for troubleshooting API interactions.
