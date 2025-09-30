#!/usr/bin/env node
'use strict';

// ECHOLOCK Setup Verification Script
// Validates that the development environment is properly configured

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  ECHOLOCK Setup Verification');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

let errors = 0;
let warnings = 0;

// Helper functions
function success(message) {
  console.log(`✓ ${message}`);
}

function error(message) {
  console.log(`✗ ${message}`);
  errors++;
}

function warning(message) {
  console.log(`⚠ ${message}`);
  warnings++;
}

function section(title) {
  console.log(`\n${title}`);
  console.log('─'.repeat(title.length));
}

// 1. Check Node.js version
section('Node.js Version');
const nodeVersion = process.versions.node;
const [major, minor] = nodeVersion.split('.').map(Number);

if (major >= 18) {
  success(`Node.js ${nodeVersion} (>= 18.0.0 required)`);
} else {
  error(`Node.js ${nodeVersion} is too old. Version >= 18.0.0 required.`);
}

// 2. Check dependencies
section('Dependencies');
const pkgPath = path.join(projectRoot, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const requiredDeps = {
  'shamir-secret-sharing': 'Shamir Secret Sharing (Privy audited)',
  'bitcoinjs-lib': 'Bitcoin operations',
  'nostr-tools': 'Nostr protocol',
  'dotenv': 'Environment configuration'
};

for (const [dep, description] of Object.entries(requiredDeps)) {
  if (pkg.dependencies[dep]) {
    const version = pkg.dependencies[dep];
    success(`${dep}@${version} - ${description}`);

    // Verify installed
    const depPath = path.join(projectRoot, 'node_modules', dep);
    if (!fs.existsSync(depPath)) {
      error(`${dep} is in package.json but not installed`);
    }
  } else {
    error(`${dep} is missing from dependencies`);
  }
}

// Dev dependencies
if (pkg.devDependencies['jest']) {
  success(`jest@${pkg.devDependencies['jest']} - Testing framework`);
} else {
  error('jest is missing from devDependencies');
}

// 3. Check Bitcoin network configuration
section('Bitcoin Network Configuration');
const constantsPath = path.join(projectRoot, 'src/bitcoin/constants.js');
const constantsContent = fs.readFileSync(constantsPath, 'utf8');

if (constantsContent.includes("name: 'testnet'")) {
  success('Bitcoin network set to TESTNET (required for development)');
} else {
  error('Bitcoin network not properly configured to testnet');
}

if (constantsContent.includes('CURRENT_NETWORK = NETWORK.TESTNET')) {
  success('Current network constant set to TESTNET');
} else {
  error('Current network constant not set to TESTNET');
}

// 4. Check security documentation
section('Security Documentation');
const securityFiles = [
  ['security/THREAT_MODEL.md', 'Threat model'],
  ['security/AUDIT_LOG.md', 'Security audit log'],
  ['security/VULNERABILITIES.md', 'Known vulnerabilities'],
  ['SECURITY.md', 'Security policy'],
  ['README.md', 'Project documentation']
];

for (const [file, description] of securityFiles) {
  const filePath = path.join(projectRoot, file);
  if (fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    success(`${file} (${stat.size} bytes) - ${description}`);
  } else {
    error(`${file} is missing`);
  }
}

// 5. Check project structure
section('Project Structure');
const requiredDirs = [
  ['src/crypto', 'Cryptographic operations (ISOLATED)'],
  ['src/bitcoin', 'Bitcoin timelock operations'],
  ['src/nostr', 'Nostr relay operations'],
  ['src/core', 'Orchestration layer'],
  ['tests/unit', 'Unit tests'],
  ['tests/integration', 'Integration tests'],
  ['security', 'Security documentation'],
  ['data', 'Local data storage']
];

for (const [dir, description] of requiredDirs) {
  const dirPath = path.join(projectRoot, dir);
  if (fs.existsSync(dirPath)) {
    const files = fs.readdirSync(dirPath).filter(f => !f.startsWith('.'));
    success(`${dir}/ (${files.length} files) - ${description}`);
  } else {
    error(`${dir}/ directory is missing`);
  }
}

// 6. Check security boundaries
section('Security Boundaries');
const cryptoFiles = fs.readdirSync(path.join(projectRoot, 'src/crypto'));
let isolationComments = 0;

for (const file of cryptoFiles) {
  if (!file.endsWith('.js')) continue;

  const content = fs.readFileSync(
    path.join(projectRoot, 'src/crypto', file),
    'utf8'
  );

  if (content.includes('SECURITY BOUNDARY')) {
    isolationComments++;
  }
}

if (isolationComments === cryptoFiles.filter(f => f.endsWith('.js')).length) {
  success(`All crypto modules have security boundary documentation`);
} else {
  warning('Some crypto modules missing security boundary comments');
}

// 7. Check strict mode
section('Code Quality');
const allJsFiles = [
  ...fs.readdirSync(path.join(projectRoot, 'src/crypto')).map(f => `src/crypto/${f}`),
  ...fs.readdirSync(path.join(projectRoot, 'src/bitcoin')).map(f => `src/bitcoin/${f}`),
  ...fs.readdirSync(path.join(projectRoot, 'src/nostr')).map(f => `src/nostr/${f}`),
  ...fs.readdirSync(path.join(projectRoot, 'src/core')).map(f => `src/core/${f}`)
].filter(f => f.endsWith('.js'));

let strictModeCount = 0;
for (const file of allJsFiles) {
  const content = fs.readFileSync(path.join(projectRoot, file), 'utf8');
  if (content.includes("'use strict'")) {
    strictModeCount++;
  }
}

if (strictModeCount === allJsFiles.length) {
  success(`All ${allJsFiles.length} source files use strict mode`);
} else {
  warning(`Only ${strictModeCount}/${allJsFiles.length} files use strict mode`);
}

// 8. Check .gitignore
section('Security Configuration');
const gitignorePath = path.join(projectRoot, '.gitignore');
const gitignore = fs.readFileSync(gitignorePath, 'utf8');

const protectedPatterns = ['.env', '*.key', '*.secret', 'node_modules'];
for (const pattern of protectedPatterns) {
  if (gitignore.includes(pattern)) {
    success(`Gitignore protects: ${pattern}`);
  } else {
    error(`Gitignore missing protection for: ${pattern}`);
  }
}

// 9. Check Nostr relay configuration
section('Nostr Configuration');
const nostrConstantsPath = path.join(projectRoot, 'src/nostr/constants.js');
const nostrContent = fs.readFileSync(nostrConstantsPath, 'utf8');

const relayCountMatch = nostrContent.match(/MIN_RELAY_COUNT:\s*(\d+)/);
if (relayCountMatch) {
  const minRelays = parseInt(relayCountMatch[1]);
  if (minRelays >= 7) {
    success(`Minimum relay count: ${minRelays} (>= 7 required for security)`);
  } else {
    error(`Minimum relay count: ${minRelays} (should be >= 7)`);
  }
}

// Count reliable relays
const relayMatches = nostrContent.match(/'wss:\/\/[^']+'/g);
if (relayMatches && relayMatches.length >= 7) {
  success(`${relayMatches.length} reliable relays configured`);
} else {
  warning(`Only ${relayMatches?.length || 0} relays configured (recommend >= 7)`);
}

// 10. Summary
section('Summary');
console.log('');

if (errors === 0 && warnings === 0) {
  console.log('🎉 Perfect! All checks passed.');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Run: npm test');
  console.log('  2. Run: npm start');
  console.log('  3. Review security documentation in /security');
} else if (errors === 0) {
  console.log(`✓ Setup complete with ${warnings} warning(s)`);
  console.log('');
  console.log('Warnings are not critical but should be addressed.');
} else {
  console.log(`✗ Setup incomplete: ${errors} error(s), ${warnings} warning(s)`);
  console.log('');
  console.log('Please fix the errors above before proceeding.');
  process.exit(1);
}

console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('⚠️  REMINDER: This is experimental software');
console.log('   Testnet only - not production ready');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');