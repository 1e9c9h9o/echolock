# Security Considerations

## Known Vulnerabilities
- Bitcoin median time past: 2-hour uncertainty window
- Shamir zero-share attacks: Mitigated by using privy-io library
- Nostr relay persistence: No guarantees, require 7+ relay redundancy

## Cryptographic Libraries
- MUST use @privy-io/shamir-secret-sharing (audited by Cure53)
- MUST use bitcoinjs-lib for Bitcoin operations
- MUST use native Node.js crypto for AES-256-GCM

## Testing Requirements
- 100% test coverage for crypto module
- Testnet only for Bitcoin operations
- No production use until professional audit