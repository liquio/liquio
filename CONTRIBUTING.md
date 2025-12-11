# Contributing to Liquio Opensource

Thank you for your interest in contributing to Liquio! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Kubernetes Setup](#kubernetes-setup)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Quality Control Scripts](#quality-control-scripts)
- [Dependency Management](#dependency-management)
- [Continuous Integration](#continuous-integration)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Git](https://git-scm.com/)
- Basic understanding of JavaScript/TypeScript and Node.js

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/liquio-opensource.git
   cd liquio-opensource
   ```
3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/liquio-opensource.git
   ```

### Initial Setup

#### Docker Compose Setup

**Basic requirements**

To deploy the Liquio platform locally, ensure you have Docker and Docker Compose installed on your system. You can find the official Docker Compose installation guide [here](https://docs.docker.com/compose/). Additionally, make sure you have the necessary permissions to execute shell scripts. The included shell scripts, such as `./scripts/init.sh`, are used to generate configuration files required for the platform's operation. Docker Compose is then utilized to set up and manage the containerized environment, simplifying the deployment process.

**Access control**

The basic local deployment includes an automatically generated Central Authority certificate and user X.509 certificates in PKCS#12 format, simplifying the initial setup process. These certificates are essential for secure communication and authentication within the platform. For production deployments, you can integrate your existing Public Key Infrastructure (PKI) to replace the auto-generated certificates, ensuring compliance with organizational security policies and standards.

**Local startup**

1. Run `./scripts/init.sh` to generate configuration files from templates.
2. Run `docker compose up -d` to setup Docker Compose environment.
3. Navigate to http://localhost:8082 to enter the admin panel.
4. Use the generated key file for admin located in config/admin.p12. The default password is 'admin'.
5. Logout and navigate to http://localhost:8081 to enter the cabinet.
6. Use the generated key file for demo user located in config/demo.p12. The default password is 'demo'.
7. Use the `./scripts/generate-user.sh` to create more user key files.

**Example process**

1. To deploy an example process, let's open the admin panel via admin key.
2. Navigate to Register list page: http://localhost:8082/registry
3. Click "Import" and select "examples/register-100-100.dat". Then confirm the import. This will import the register schema for students.
4. Do the same for "examples/register-100-101.dat" and "examples/register-100-102.dat". This will import the register schemas for institutions and groups.
5. Let's navigate to Workflow list: http://localhost:8082/workflow
6. Click import, continue without skipping the validation, and select "examples/workflow-1000.bpmn" file for import. Confirm to continue.
7. You can now open the workflow configuration page and play with it: http://localhost:8082/workflow/1000
8. Let's log out and open the cabinet: http://localhost:8081. Use the demo key this time.
9. Click "Order a service" and select "Student editing".

3. Install dependencies for the service you're working on:
   ```bash
   cd <service-name>
   npm install
   ## Kubernetes Setup

For Kubernetes development and testing:

1. Install prerequisites:
   - [minikube](https://minikube.sigs.k8s.io/docs/start/)
   - [kubectl](https://kubernetes.io/docs/tasks/tools/#kubectl)
   - [helm](https://helm.sh/docs/intro/install/)
2. Start minikube: `minikube start`.
3. Add ingress addon: `minikube addons enable ingress`.
4. Patch ingress controller to use LoadBalancer type: `kubectl patch svc ingress-nginx-controller -n ingress-nginx -p '{"spec": {"type": "LoadBalancer"}}'`.
5. Setup minikube's Docker environment: `eval $(minikube docker-env)`.
6. Build the images in the environment: `./scripts/build-images.sh`.
7. Install the Helm chart: `helm install liquio ./helm-chart -f ./helm-chart/values.yaml --create-namespace --namespace liquio`.
8. Set default namespace: `kubectl config set-context --current --namespace=liquio`
9. Wait for the deployment to be ready: `kubectl get pods -w`.
10. Setup domain name resolution:
    10.1. Start minikube tunnel (in a separate terminal, keep it running): `minikube tunnel`
    10.2. Get the LoadBalancer ClusterIP: `CLUSTER_IP=$(kubectl get svc ingress-nginx-controller -n ingress-nginx -o jsonpath='{.spec.clusterIP}')`
    10.3. Add service domain names to hosts file (mapped to ClusterIP): `echo "$CLUSTER_IP admin.liquio.local admin-api.liquio.local cabinet.liquio.local cabinet-api.liquio.local id.liquio.local id-api.liquio.local" | sudo tee -a /etc/hosts`
11. Generate user keys:
    11.1. `./scripts/generate-user.sh --k8s-secret "liquio-ca-certs" --first-name "Admin" --last-name "Liquio" --serial-number "0000000001" --password "admin" --output admin.p12`
    11.2. `./scripts/generate-user.sh --k8s-secret "liquio-ca-certs" --first-name "Demo" --last-name "Liquio" --serial-number "3123456789" --password "demo" --output demo.p12`
12. Access http://admin.liquio.local from the browser.

## Development Workflow

### Branch Strategy

- `main` - Stable, production-ready code
- `develop` - Integration branch for features
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Critical production fixes

### Creating a Feature Branch

```bash
git checkout develop
git pull upstream develop
git checkout -b feature/your-feature-name
```

### Making Changes

1. Make your changes in your feature branch
2. Write or update tests as needed
3. Run quality checks before committing:
   ```bash
   # From the service directory
   npm run lint
   npm test
   
   # Or run checks for all services
   ./scripts/check.sh --fix
   ```

4. Commit your changes with clear, descriptive messages:
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

### Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes

**Examples:**
```bash
feat(admin-api): add user role management endpoint
fix(id-api): resolve JWT token expiration issue
docs(readme): update Docker Compose setup instructions
test(task): add integration tests for workflow execution
```

### Keeping Your Branch Updated

```bash
git fetch upstream
git rebase upstream/develop
```

## Coding Standards

### General Guidelines

- Write clean, readable, and maintainable code
- Follow the existing code style in each service
- Add comments for complex logic
- Keep functions small and focused
- Use meaningful variable and function names

### JavaScript/TypeScript

- Use ES6+ features
- Prefer `const` and `let` over `var`
- Use async/await over callbacks
- Handle errors properly
- Avoid nested callbacks (callback hell)

### Linting

Each service has its own ESLint configuration. Run linting before committing:

```bash
# Single service
cd <service-name>
npm run lint

# Auto-fix issues
npm run lint:fix

# All services
./scripts/lint.sh
```

### Code Formatting

- Indentation: 2 spaces
- Line length: 100-120 characters (soft limit)
- Semicolons: Follow project conventions
- Quotes: Single quotes for strings (unless otherwise specified)

## Testing

### Running Tests

```bash
# Single service
cd <service-name>
npm test

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:cov

# All services
./scripts/test.sh
```

### Writing Tests

- Write tests for new features and bug fixes
- Aim for high test coverage (>80%)
- Use descriptive test names
- Follow the AAA pattern (Arrange, Act, Assert)
- Mock external dependencies

**Example:**
```javascript
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a new user with valid data', async () => {
      // Arrange
      const userData = { name: 'Test User', email: 'test@example.com' };
      
      // Act
      const user = await userService.createUser(userData);
      
      // Assert
      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
    });
  });
});
```

### End-to-End Tests

Some services include E2E tests. Run them with:

```bash
npm run test:e2e
```

## Quality Control Scripts

The monorepo includes automated scripts for running tests, linting, and security audits across all services.

### Quick Start

Run all quality checks with summary output:

```bash
./scripts/check.sh --quiet
```

Run specific checks:

```bash
./scripts/check.sh --lint --quiet    # Linting only
./scripts/check.sh --test --quiet    # Tests only
./scripts/check.sh --audit --quiet   # Security audit only
```

Auto-fix issues:

```bash
./scripts/check.sh --fix
```

For all available options, run:

```bash
./scripts/check.sh --help
```

### Individual Scripts

If you need more control, you can run scripts individually:

```bash
./scripts/lint.sh          # Check code style
./scripts/test.sh          # Run tests
./scripts/audit.sh         # Check security vulnerabilities
```

Each script supports `--help` for detailed usage:

```bash
./scripts/lint.sh --help
./scripts/test.sh --help
./scripts/audit.sh --help
```

## Dependency Management

The monorepo uses automated dependency update configurations to keep packages current and secure.

### Renovate (Recommended for monorepos)

Configuration file: `renovate.json`

**Features:**

- Automatically groups updates (major, minor, patch, dev dependencies)
- Scheduled update windows to avoid conflicts
- Auto-merge safe updates (minor/patch)
- Security vulnerability detection
- Per-package rules for critical dependencies

**How it works:**

- Renovate automatically creates pull requests for available updates
- PRs are created on weekdays during off-peak hours
- Major updates require manual review
- Minor and patch updates can be auto-merged after passing all checks

To enable Renovate:

1. Install [Renovate GitHub App](https://github.com/apps/renovate)
2. Grant repository access
3. Renovate will automatically scan for updates

### Dependabot (GitHub Native)

Configuration file: `.github/dependabot.yml`

**Features:**

- Native GitHub integration
- Service-specific update schedules to prevent conflicts
- Automatic PR creation and labeling
- Security and version update tracking

**How it works:**

- Dependabot creates separate PRs for each service
- Updates are scheduled throughout the week to avoid conflicts
- Each PR is labeled with the service name for easy filtering

To enable Dependabot:

1. Ensure `.github/dependabot.yml` is in your repository
2. Go to repository Settings → Code security and analysis
3. Enable "Dependabot version updates"

## Continuous Integration

These scripts are designed to be used in CI/CD pipelines. Example for GitHub Actions:

```yaml
- name: Run linting
  run: ./scripts/lint.sh

- name: Run tests
  run: ./scripts/test.sh

- name: Run security audit
  run: ./scripts/audit.sh --production
```

### Before Submitting

1. ✅ All tests pass
2. ✅ Linting passes
3. ✅ No security vulnerabilities (`npm audit`)
4. ✅ Code is properly formatted
5. ✅ Documentation is updated
6. ✅ Commit messages follow conventions
7. ✅ Branch is up to date with `develop`

### Submitting a Pull Request

1. Push your branch to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. Open a Pull Request on GitHub against the `develop` branch

3. Fill out the PR template with:
   - Clear description of changes
   - Link to related issues
   - Screenshots (if UI changes)
   - Testing performed
   - Breaking changes (if any)

4. Request review from maintainers

### PR Title Format

Follow the same convention as commit messages:

```
feat(service-name): add feature description
```

### Review Process

- Maintainers will review your PR
- Address any feedback or requested changes
- Keep the discussion focused and professional
- Once approved, a maintainer will merge your PR

### After Merge

- Delete your feature branch
- Update your local repository:
  ```bash
  git checkout develop
  git pull upstream develop
  ```

## Reporting Issues

### Bug Reports

Use the bug report template and include:

- Clear, descriptive title
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, Docker version)
- Relevant logs or error messages
- Screenshots (if applicable)

### Feature Requests

Use the feature request template and include:

- Clear description of the feature
- Use case and motivation
- Proposed implementation (if any)
- Alternative solutions considered

### Security Vulnerabilities

**Do not** create public issues for security vulnerabilities. See [SECURITY.md](SECURITY.md) for reporting procedures.

## Documentation

### Code Documentation

- Add JSDoc comments for functions, classes, and modules
- Document complex algorithms or business logic
- Keep comments up to date with code changes

**Example:**
```javascript
/**
 * Creates a new workflow instance from a template
 * @param {string} templateId - The workflow template identifier
 * @param {Object} variables - Initial workflow variables
 * @returns {Promise<Workflow>} The created workflow instance
 * @throws {ValidationError} If template is invalid
 */
async function createWorkflow(templateId, variables) {
  // Implementation
}
```

### README Updates

- Update README.md when adding new features
- Document new configuration options
- Add examples for new functionality
- Keep setup instructions current

### API Documentation

- Document API endpoints using OpenAPI/Swagger
- Include request/response examples
- Document error responses
- Keep API docs synchronized with code

## Community

### Communication Channels

- **GitHub Issues**: Bug reports, feature requests
- **GitHub Discussions**: General questions, ideas
- **Pull Requests**: Code review and discussions

### Getting Help

- Check existing documentation and issues first
- Provide context when asking questions
- Be patient and respectful
- Help others when you can

### Recognition

Contributors will be recognized in:
- Release notes
- CONTRIBUTORS file
- Security advisories (for security researchers)

## Development Tips

### Service-Specific Development

#### Backend Services (Node.js/Express/NestJS)

```bash
cd <service-name>
npm install
npm run start:dev  # Start with hot reload
npm run lint:fix   # Fix linting issues
npm test          # Run tests
```

#### Frontend Services (React)

```bash
cd <service-name>
npm install
npm start         # Start development server
npm run lint:fix  # Fix linting issues
npm run build     # Production build
```

### Debugging

- Use Node.js debugger or VS Code debugging
- Enable debug logs: `DEBUG=* npm start`
- Check Docker logs: `docker compose logs -f <service-name>`
- Use browser DevTools for frontend debugging

### Database Migrations

When working with database changes:

```bash
# Create migration
npm run migration-generate

# Run migrations
npm run migration-up

# Rollback migrations
npm run migration-clear
```

### Working with Configurations

- Configuration templates are in `/config-templates`
- Generated configs are in `/config` (git-ignored)
- Service-specific configs are in each service directory
- Re-run `./scripts/init.sh` after template changes

### Additional Development Tips

- Run `./scripts/check.sh --fix` before committing to auto-fix lint issues
- Run `./scripts/test.sh --watch id-api` while developing to get instant feedback
- Use `./scripts/audit.sh` regularly to catch security issues early
- Check the help for any script: `./scripts/[script-name].sh --help`

## Quality Checklist

Before submitting your contribution:

- [ ] Code follows project style guidelines
- [ ] Self-review of code completed
- [ ] Code commented, particularly in complex areas
- [ ] Documentation updated
- [ ] Tests added/updated and passing
- [ ] Lint checks passing
- [ ] No console.log or debug statements
- [ ] No merge conflicts
- [ ] Commit messages follow conventions
- [ ] PR description is clear and complete
