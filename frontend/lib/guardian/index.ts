/**
 * Guardian Network Module
 *
 * Provides functionality for the distributed Guardian Network:
 * - Share distribution to guardians
 * - NIP-44 encryption
 * - Guardian enrollment protocol
 *
 * @see CLAUDE.md - Phase 3: Guardian Network
 */

export * from './types';
export * from './nip44';
export * from './enrollment';
export * from './keyRotation';

// Re-export commonly used functions
export {
  createGuardianEnrollment,
  publishShareStorageEvent,
  enrollGuardians,
  queryGuardianAcks,
  generateInvitationLink,
  validateGuardianNpub,
  getDefaultGuardians,
} from './enrollment';

export { encrypt as nip44Encrypt, decrypt as nip44Decrypt } from './nip44';

export type {
  Guardian,
  GuardianType,
  GuardianStatus,
  GuardianInvitation,
  MonitoringConfig,
} from './types';
