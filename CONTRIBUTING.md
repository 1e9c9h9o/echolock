# Contributing to ECHOLOCK

Thank you for your interest in contributing to ECHOLOCK! This document provides guidelines for contributing to this cryptographic dead man's switch project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Security-First Development](#security-first-development)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Project Structure](#project-structure)

## Code of Conduct

This project follows standard open-source community guidelines:
- Be respectful and inclusive
- Focus on constructive criticism
- Prioritize security and correctness over features
- Document decisions and trade-offs

## Getting Started

### Prerequisites

```bash
# Required
Node.js >= 18.0.0
npm >= 9.0.0

# Optional but recommended
Git
Bitcoin Core (for testnet development)
PostgreSQL (for backend development)
```

### Setup Development Environment

```bash
# Clone the repository
git clone https://github.com/1e9c9h9o/echolock.git
cd echolock

# Install dependencies
npm install

# Run tests to verify setup
npm test

# Run the demo
npm run demo
```

## Development Process

### 1. Choose an Issue

- Check [open issues](https://github.com/1e9c9h9o/echolock/issues)
- Look for issues tagged `good-first-issue` or `help-wanted`
- Comment on the issue to claim it
- For major changes, open a discussion issue first

### 2. Create a Branch

```bash
# Create a feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-description
```

### 3. Make Changes

- Follow the coding standards below
- Write comprehensive tests
- Update documentation
- Keep commits atomic and well-described

### 4. Test Thoroughly

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration
```

## Security-First Development

### Critical Rules

1. **NEVER** modify cryptographic primitives without expert review
2. **ALWAYS** achieve 100% test coverage for crypto code
3. **NEVER** store secrets in code, logs, or error messages
4. **ALWAYS** use audited libraries for cryptographic operations
5. **NEVER** merge code with failing security tests

### Cryptographic Code Guidelines

**DO**:
- Use `crypto.randomBytes()` for random number generation
- Use audited libraries (`shamir-secret-sharing`, `bitcoinjs-lib`, `nostr-tools`)
- Write property-based tests for crypto operations
- Document all cryptographic assumptions
- Use constant-time comparisons for sensitive data

**DON'T**:
- Use `Math.random()` for anything security-related
- Implement custom cryptographic algorithms
- Log or expose sensitive data in error messages
- Modify crypto module without security review

### Code Review Requirements for Crypto Changes

Changes to `/src/crypto/**` require:
1. 100% test coverage
2. Property-based tests demonstrating correctness
3. Review by at least 2 maintainers
4. Security-focused code review
5. Documentation of cryptographic assumptions

## Testing Requirements

### Coverage Requirements

| Module | Coverage Required |
|--------|------------------|
| `/src/crypto/**` | 100% |
| `/src/bitcoin/**` | 95% |
| `/src/nostr/**` | 90% |
| `/src/core/**` | 90% |
| Other modules | 80% |

### Test Types

**Unit Tests** (`tests/unit/`)
- Test individual functions in isolation
- Mock external dependencies
- Fast execution (<1s total)

**Integration Tests** (`tests/integration/`)
- Test interactions between modules
- Use real Nostr relays and Bitcoin testnet
- May have longer execution times

**Property-Based Tests**
- Use `fast-check` for cryptographic operations
- Verify mathematical properties hold
- Required for all crypto functions

### Example Test Structure

```javascript
describe('secretSharing', () => {
  describe('split', () => {
    it('should split secret into N shares', () => {
      // Test implementation
    });

    it('should reconstruct with threshold shares', () => {
      // Test implementation
    });

    it('should fail with insufficient shares', () => {
      // Test implementation
    });

    // Property-based test
    it('should always reconstruct with sufficient shares', () => {
      fc.assert(
        fc.property(fc.string(), (secret) => {
          const shares = split(secret, 5, 3);
          const reconstructed = combine(shares.slice(0, 3));
          return reconstructed === secret;
        })
      );
    });
  });
});
```

## Pull Request Process

### Before Submitting

- [ ] All tests pass (`npm test`)
- [ ] Code coverage meets requirements
- [ ] Code follows style guidelines
- [ ] Documentation is updated
- [ ] Commit messages are clear and descriptive
- [ ] No security vulnerabilities introduced
- [ ] Self-review completed

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature causing existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Security fix

## Testing
Describe testing performed:
- Unit tests added/modified
- Integration tests added/modified
- Manual testing steps

## Security Considerations
Describe any security implications:
- Cryptographic changes: Yes/No
- Network interactions: Yes/No
- Data handling changes: Yes/No

## Checklist
- [ ] Tests pass locally
- [ ] Code coverage maintained/improved
- [ ] Documentation updated
- [ ] Self-reviewed code
- [ ] No new warnings or errors
```

### Review Process

1. Automated checks must pass (tests, linting, coverage)
2. At least one maintainer review required
3. Security-sensitive changes require 2+ reviews
4. Address all review comments
5. Maintainer merges approved PRs

## Coding Standards

### JavaScript Style

```javascript
// Use ES6+ syntax
import { something } from './module.js';

// Use const by default, let when reassignment needed
const CONSTANT_VALUE = 42;
let mutableValue = 0;

// Use descriptive variable names
const encryptionKey = generateKey();
const shareFragments = splitSecret(secret);

// Use async/await over promises
async function fetchData() {
  try {
    const result = await apiCall();
    return result;
  } catch (error) {
    handleError(error);
  }
}

// Document complex functions
/**
 * Splits a secret into N shares using Shamir Secret Sharing
 * @param {string} secret - The secret to split
 * @param {number} totalShares - Total number of shares to create
 * @param {number} threshold - Minimum shares needed for reconstruction
 * @returns {Array<string>} Array of share fragments
 */
function splitSecret(secret, totalShares, threshold) {
  // Implementation
}
```

### File Organization

```
src/
├── crypto/          # Cryptographic primitives (ISOLATED - no network access)
├── bitcoin/         # Bitcoin timelock operations
├── nostr/           # Nostr relay communications
├── core/            # Core DMS logic
├── api/             # Backend API
└── cli/             # Command-line interface

tests/
├── unit/            # Unit tests
├── integration/     # Integration tests
└── fixtures/        # Test data

docs/
└── ARCHITECTURE.md  # Architecture documentation
```

### Error Handling

```javascript
// Use descriptive error messages
throw new Error('Failed to encrypt message: invalid key length');

// Don't expose sensitive data in errors
// BAD: throw new Error(`Encryption failed with key: ${key}`);
// GOOD: throw new Error('Encryption failed: invalid key parameters');

// Use error classes for different error types
class CryptographicError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CryptographicError';
  }
}
```

### Documentation

- Document all public APIs with JSDoc
- Explain "why" in comments, not "what"
- Keep README.md updated with feature changes
- Update SECURITY.md for security-relevant changes
- Document cryptographic assumptions and trade-offs

## Project Structure

### Module Boundaries

**Crypto Module** (`src/crypto/`)
- NO network access
- NO file I/O (except for testing)
- Pure functions only
- 100% test coverage required

**Bitcoin Module** (`src/bitcoin/`)
- Testnet only (enforced in code)
- Uses audited `bitcoinjs-lib`
- Clear error messages for timelock edge cases

**Nostr Module** (`src/nostr/`)
- Assumes adversarial relay environment
- Implements health checking and redundancy
- Geographic distribution preferred

**Core Module** (`src/core/`)
- Orchestrates other modules
- Implements DMS state machine
- Handles configuration and coordination

## Common Tasks

### Adding a New Feature

1. Check if feature aligns with project goals
2. Open an issue for discussion
3. Get maintainer approval
4. Implement with tests
5. Update documentation
6. Submit PR

### Fixing a Bug

1. Create issue describing bug
2. Add failing test demonstrating bug
3. Fix bug
4. Ensure test passes
5. Submit PR

### Improving Documentation

1. Identify unclear/outdated documentation
2. Make improvements
3. Submit PR (no issue needed for docs)

### Reporting Security Issues

**DO NOT** open public issues for security vulnerabilities!

Instead:
- Email: echoooolock@gmail.com
- GitHub Security Advisory: [Create Advisory](https://github.com/1e9c9h9o/echolock/security/advisories/new)

See [SECURITY.md](SECURITY.md) for details.

## Resources

- [Architecture Documentation](docs/ARCHITECTURE.md)
- [Security Policy](SECURITY.md)
- [Threat Model](security/THREAT_MODEL.md)
- [Roadmap](ROADMAP.md)

## Questions?

- Open a [Discussion](https://github.com/1e9c9h9o/echolock/discussions)
- Check existing issues
- Read the documentation

## License

By contributing to ECHOLOCK, you agree that your contributions will be licensed under the AGPL-3.0 license. See [LICENSE](LICENSE) for details.

---

**Thank you for contributing to ECHOLOCK!** Your efforts help make cryptographic software more secure and accessible.
