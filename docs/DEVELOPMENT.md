# ECHOLOCK Development Guide

## Prerequisites

### Required
- Node.js ≥18.0.0
- npm or yarn
- Git
- Bitcoin testnet access (for testing)

### Recommended
- VS Code with ESLint extension
- Bitcoin testnet wallet
- Nostr client for testing

---

## Getting Started

### Initial Setup
```bash
# Clone repository
git clone <repository-url>
cd echolock

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Running the Application
```bash
# Run CLI
npm start

# Development mode (with auto-reload)
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

---

## Development Workflow

### 1. Security-First Development
**Every change must consider security implications**

Before writing code:
- Review threat model (`/security/THREAT_MODEL.md`)
- Check for existing vulnerabilities (`/security/VULNERABILITIES.md`)
- Understand security boundaries (documented in module headers)

### 2. Testing Requirements
**Critical**: Crypto module requires 100% test coverage

```bash
# Run tests with coverage report
npm run test:coverage

# Coverage must be 100% for /src/crypto
```

Test categories:
- **Unit tests**: Individual function testing
- **Integration tests**: Cross-module interactions
- **Security tests**: Specific attack scenario testing

### 3. Code Review Checklist
- [ ] No custom cryptographic implementations
- [ ] All user inputs validated
- [ ] Error messages don't leak sensitive information
- [ ] Proper use of audited libraries
- [ ] Test coverage adequate
- [ ] Documentation updated

---

## Module Development Guidelines

### Crypto Module (`/src/crypto`)
**CRITICAL: This module is security-isolated**

Rules:
- NO network operations
- NO file I/O (except through crypto module API)
- NO console.log with sensitive data
- MUST use audited libraries only
- MUST have 100% test coverage

Example structure:
```javascript
'use strict';

// SECURITY BOUNDARY: ISOLATED MODULE - NO NETWORK ACCESS ALLOWED
//
// [Module description and security considerations]

import crypto from 'crypto';

/**
 * [Function description]
 * @param {Type} param - Description
 * @returns {Type} Description
 */
export function myFunction(param) {
  // Validate inputs
  if (!param) {
    throw new Error('Invalid parameter');
  }

  // Implementation
  // ...

  return result;
}
```

### Bitcoin Module (`/src/bitcoin`)
**CRITICAL: Must be mock-testable**

Rules:
- Testnet only until professional audit
- All timelock calculations must account for MTP
- Fee estimation must handle extreme cases
- Network operations must be mockable

### Nostr Module (`/src/nostr`)
**CRITICAL: Must handle relay failures**

Rules:
- Minimum 7 relays per operation
- All network operations must timeout
- Handle WebSocket errors gracefully
- Never trust single relay

### Core Module (`/src/core`)
**CRITICAL: Orchestration only**

Rules:
- NO cryptographic operations
- NO direct crypto.randomBytes() calls
- Delegate all crypto to crypto module
- Event-driven architecture

---

## Testing Guidelines

### Unit Test Template
```javascript
'use strict';

import { functionToTest } from '../src/module/file.js';

describe('Module Name', () => {
  describe('functionToTest', () => {
    test('should handle valid input', () => {
      const result = functionToTest(validInput);
      expect(result).toBe(expectedOutput);
    });

    test('should reject invalid input', () => {
      expect(() => {
        functionToTest(invalidInput);
      }).toThrow('Expected error message');
    });

    test('should handle edge cases', () => {
      // Test boundary conditions
    });
  });
});
```

### Security Test Examples
```javascript
// Test constant-time comparison
test('password verification should be timing-safe', async () => {
  const correctPassword = 'correct';
  const wrongPassword = 'wrong';

  const start1 = performance.now();
  await verifyPassword(correctPassword, salt, hash);
  const time1 = performance.now() - start1;

  const start2 = performance.now();
  await verifyPassword(wrongPassword, salt, hash);
  const time2 = performance.now() - start2;

  // Timing difference should be minimal
  expect(Math.abs(time1 - time2)).toBeLessThan(1); // 1ms threshold
});
```

---

## Debugging

### Debug Mode
```bash
# Enable debug logging
DEBUG=true npm start
```

### Common Issues

**Issue**: "SECURITY: Only testnet is allowed"
- Solution: Ensure `BITCOIN_NETWORK=testnet` in `.env`

**Issue**: "Insufficient relays configured"
- Solution: Add more relay URLs to `NOSTR_RELAYS` in `.env`

**Issue**: "Module not found"
- Solution: Ensure `"type": "module"` is in `package.json`

---

## Contributing

### Before Submitting PR
1. Run full test suite: `npm test`
2. Check coverage: `npm run test:coverage`
3. Update documentation if needed
4. Add entry to `AUDIT_LOG.md` for security-critical changes
5. Update `VULNERABILITIES.md` if introducing known limitations

### PR Description Template
```markdown
## Description
[Brief description of changes]

## Security Impact
[Describe any security implications]

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manually tested on testnet

## Checklist
- [ ] No custom crypto implementations
- [ ] All inputs validated
- [ ] Test coverage adequate
- [ ] Documentation updated
- [ ] Security audit log updated (if applicable)
```

---

## Security Audit Preparation

### Audit Checklist
- [ ] All dependencies up to date
- [ ] No known vulnerabilities in dependencies
- [ ] 100% test coverage for crypto module
- [ ] Threat model reviewed and current
- [ ] All TODOs resolved or documented
- [ ] Code review completed for all security-critical paths

### Audit Artifacts
Prepare for auditors:
1. `ARCHITECTURE.md` - System design
2. `THREAT_MODEL.md` - Security analysis
3. `AUDIT_LOG.md` - Change history
4. Test coverage reports
5. Dependency tree and licenses

---

## Resources

### Cryptography
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [libsodium Documentation](https://doc.libsodium.org/)

### Bitcoin
- [Bitcoin Developer Guide](https://developer.bitcoin.org/devguide/)
- [Learn Me a Bitcoin](https://learnmeabitcoin.com/)

### Nostr
- [Nostr Protocol Documentation](https://github.com/nostr-protocol/nips)
- [awesome-nostr](https://github.com/aljazceru/awesome-nostr)

### Testing
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Node.js crypto module](https://nodejs.org/api/crypto.html)

---

## Support

### Questions
- Review documentation in `/docs`
- Check `/security` for security-related questions
- Review existing issues on GitHub

### Security Issues
**DO NOT** open public issues for security vulnerabilities.
Contact maintainers privately.

---

## License
[To be determined]