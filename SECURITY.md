# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Currently supported versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of Liquio seriously. If you discover a security vulnerability, please follow these steps:

### 1. **Do Not** Disclose Publicly

Please do not open a public GitHub issue for security vulnerabilities. This helps protect users who haven't yet updated.

### 2. Report Privately

Send your report via email to the project maintainers. Include:

- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Suggested fix (if any)
- Your contact information

### 3. Response Timeline

- **Initial Response**: Within 48 hours of report submission
- **Status Update**: Within 7 days with either:
  - Confirmation and estimated fix timeline
  - Request for additional information
  - Rejection with reasoning (if not a valid security issue)
- **Resolution**: Security patches are prioritized and typically released within 30 days for critical vulnerabilities

### 4. Disclosure Process

- We will work with you to understand and validate the issue
- Once a fix is prepared, we will:
  - Notify you before public release
  - Credit you in the security advisory (unless you prefer to remain anonymous)
  - Release a security patch
  - Publish a security advisory

## Security Best Practices

### For Production Deployments

1. **Certificate Management**
   - Replace auto-generated certificates with your organization's PKI
   - Use strong passwords for PKCS#12 certificate files
   - Regularly rotate certificates before expiration
   - Store private keys securely and never commit them to version control

2. **Access Control**
   - Implement network segmentation
   - Use firewalls to restrict access to services
   - Enable HTTPS/TLS for all external communications
   - Regularly audit user access and certificates

3. **Configuration Security**
   - Review and customize all configuration files in `/config`
   - Change default passwords immediately
   - Use environment-specific configurations
   - Enable authentication for all services (Redis, PostgreSQL, RabbitMQ)
   - Restrict database access to application services only

4. **Container Security**
   - Keep Docker images updated
   - Run containers as non-root users where possible
   - Use Docker secrets for sensitive data in Kubernetes deployments
   - Regularly scan images for vulnerabilities

5. **Network Security**
   - Use reverse proxy with rate limiting
   - Enable CORS only for trusted domains
   - Implement proper JWT token validation and expiration
   - Use secure WebSocket connections (WSS)

6. **Monitoring & Auditing**
   - Enable and monitor application logs
   - Set up alerts for suspicious activities
   - Regularly review access logs
   - Implement intrusion detection systems

7. **Dependency Management**
   - Run `npm audit` regularly across all services
   - Use automated dependency updates (Renovate/Dependabot)
   - Review and test updates before applying to production
   - Monitor security advisories for used packages

### Development Security

1. **Code Quality**
   - Run `./scripts/check.sh` before committing code
   - Use `./scripts/audit.sh --production` to check for vulnerabilities
   - Keep dependencies up to date
   - Follow secure coding practices

2. **Secrets Management**
   - Never commit secrets, keys, or passwords
   - Use environment variables for sensitive configuration
   - Add sensitive files to `.gitignore`
   - Rotate credentials immediately if accidentally exposed

3. **Testing**
   - Include security tests in your test suite
   - Test authentication and authorization flows
   - Validate input sanitization
   - Test rate limiting and DoS protection

## Security Features

### Built-in Security

- **X.509 Certificate Authentication**: User authentication via PKI certificates
- **JWT Tokens**: Secure session management
- **Input Validation**: Express validator middleware
- **SQL Injection Protection**: Sequelize ORM with parameterized queries
- **XSS Protection**: Input sanitization via sanitize-html
- **CORS Configuration**: Configurable cross-origin resource sharing
- **Rate Limiting**: Optional rate limiting middleware
- **Secure Headers**: Compression and security headers

### Known Limitations

- Auto-generated certificates are for **development only**
- Default passwords must be changed in production
- Local deployment uses HTTP by default (add reverse proxy for HTTPS)
- Session management requires proper Redis security configuration

## Security Audit Schedule

- **Dependencies**: Automated weekly scans via Renovate/Dependabot
- **Code Quality**: Continuous via CI/CD pipeline
- **Penetration Testing**: Recommended annually for production deployments
- **Security Review**: Before major version releases

## Vulnerability Disclosure Timeline

Once a security vulnerability is confirmed:

1. **Day 0**: Vulnerability confirmed and acknowledged
2. **Day 1-7**: Assessment and fix development
3. **Day 7-14**: Testing and validation
4. **Day 14-30**: Patch release and notification
5. **Day 30+**: Public disclosure (if appropriate)

Critical vulnerabilities may be expedited.

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Docker Security](https://docs.docker.com/engine/security/)
- [Kubernetes Security](https://kubernetes.io/docs/concepts/security/)

## Security-Related Configuration

### Environment Variables for Production

```bash
# Use strong, randomly generated secrets
JWT_SECRET=<your-strong-secret>
SESSION_SECRET=<your-session-secret>

# Database credentials
DB_PASSWORD=<strong-db-password>

# Redis authentication
REDIS_PASSWORD=<redis-password>

# RabbitMQ credentials
RABBITMQ_USER=<rabbitmq-user>
RABBITMQ_PASSWORD=<rabbitmq-password>

# Enable HTTPS
USE_HTTPS=true
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem
```

## License

This security policy is part of the Liquio Opensource project, licensed under AGPL-3.0. See [LICENSE.md](LICENSE.md) for details.
