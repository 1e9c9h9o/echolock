/**
 * Dry Run Simulation Engine
 *
 * Provides 100% client-side simulation of the entire release process.
 * Uses real crypto operations but on test data - no actual messages or keys exposed.
 *
 * @see CLAUDE.md - Dry Run / Simulation Mode
 */

import {
  generateEncryptionKey,
  encrypt,
  decrypt,
  exportKey,
  importKey,
  toHex,
  toBase64,
  fromBase64,
  randomBytes,
} from '../crypto/aes';
import {
  splitSimple as shamirSplit,
  combine as shamirCombine,
  generateAuthKey,
  computeShareHMAC,
  type Share,
} from '../crypto/shamir';
import { DEFAULT_RELAYS } from '../nostr/types';

/**
 * Individual simulation step
 */
export interface SimulationStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'success' | 'warning' | 'error';
  duration?: number; // milliseconds
  details?: Record<string, unknown>;
  error?: string;
}

/**
 * Guardian health result from simulation
 */
export interface SimulatedGuardianHealth {
  npub: string;
  name: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  lastHeartbeat?: Date;
  responseTime?: number; // milliseconds
  available: boolean;
}

/**
 * Complete simulation result
 */
export interface SimulationResult {
  steps: SimulationStep[];
  overallStatus: 'pass' | 'warning' | 'fail';
  estimatedRecoveryTime: number; // milliseconds
  guardiansResponded: number;
  guardiansTotal: number;
  thresholdMet: boolean;
  warnings: string[];
  errors: string[];
  startedAt: Date;
  completedAt: Date;
}

/**
 * Switch configuration for simulation
 */
export interface SwitchConfig {
  id: string;
  title: string;
  guardians: Array<{
    id: string;
    npub: string;
    name: string;
    status: string;
  }>;
  recipients: Array<{
    email: string;
    name?: string;
  }>;
  thresholdConfig: {
    totalShares: number;
    threshold: number;
  };
  relayUrls?: string[];
  nostrPublicKey?: string;
}

/**
 * Progress callback for real-time updates
 */
export type SimulationProgressCallback = (step: SimulationStep) => void;

/**
 * Create initial simulation steps
 */
function createInitialSteps(): SimulationStep[] {
  return [
    {
      id: 'config-validation',
      title: 'Configuration Validation',
      description: 'Verifying switch configuration',
      status: 'pending',
    },
    {
      id: 'guardian-health',
      title: 'Guardian Health Check',
      description: 'Checking guardian availability',
      status: 'pending',
    },
    {
      id: 'share-generation',
      title: 'Simulate Share Release',
      description: 'Testing Shamir secret sharing',
      status: 'pending',
    },
    {
      id: 'key-reconstruction',
      title: 'Simulate Recovery',
      description: 'Testing key reconstruction',
      status: 'pending',
    },
    {
      id: 'recipient-preview',
      title: 'Recipient Preview',
      description: 'Preparing notification preview',
      status: 'pending',
    },
  ];
}

/**
 * Step 1: Validate switch configuration
 */
async function validateConfiguration(
  config: SwitchConfig,
  step: SimulationStep,
  onProgress: SimulationProgressCallback
): Promise<{ success: boolean; warnings: string[]; errors: string[] }> {
  const startTime = Date.now();
  step.status = 'running';
  onProgress(step);

  const warnings: string[] = [];
  const errors: string[] = [];

  // Check threshold configuration
  const { totalShares, threshold } = config.thresholdConfig;
  if (threshold < 2) {
    errors.push('Threshold must be at least 2');
  }
  if (totalShares < threshold) {
    errors.push('Total shares must be at least equal to threshold');
  }

  // Check guardians
  if (config.guardians.length < totalShares) {
    warnings.push(
      `Only ${config.guardians.length} guardians configured, but ${totalShares} needed for ${threshold}-of-${totalShares} threshold`
    );
  }

  // Check recipients
  if (config.recipients.length === 0) {
    errors.push('No recipients configured');
  }

  // Check Nostr pubkey
  if (!config.nostrPublicKey) {
    warnings.push('No Nostr public key configured - heartbeats may not work');
  }

  // Check relays
  const relays = config.relayUrls || DEFAULT_RELAYS;
  if (relays.length < 3) {
    warnings.push('Less than 3 relays configured - redundancy may be insufficient');
  }

  step.duration = Date.now() - startTime;
  step.details = {
    guardianCount: config.guardians.length,
    recipientCount: config.recipients.length,
    thresholdConfig: `${threshold}-of-${totalShares}`,
    relayCount: relays.length,
  };

  if (errors.length > 0) {
    step.status = 'error';
    step.error = errors.join('; ');
  } else if (warnings.length > 0) {
    step.status = 'warning';
  } else {
    step.status = 'success';
  }

  onProgress(step);
  return { success: errors.length === 0, warnings, errors };
}

/**
 * Step 2: Check guardian health (simulated + optional live query)
 */
async function checkGuardianHealth(
  config: SwitchConfig,
  step: SimulationStep,
  onProgress: SimulationProgressCallback,
  queryLive: boolean = false
): Promise<{
  success: boolean;
  guardiansHealthy: SimulatedGuardianHealth[];
  warnings: string[];
}> {
  const startTime = Date.now();
  step.status = 'running';
  onProgress(step);

  const warnings: string[] = [];
  const guardianHealth: SimulatedGuardianHealth[] = [];
  const { threshold } = config.thresholdConfig;

  // Simulate or query guardian health
  for (const guardian of config.guardians) {
    const healthStart = Date.now();

    // In a real implementation, this would query Nostr for heartbeat events
    // For simulation, we use the stored status
    let status: 'healthy' | 'warning' | 'critical' | 'unknown';
    switch (guardian.status) {
      case 'active':
        status = 'healthy';
        break;
      case 'pending':
        status = 'warning';
        break;
      case 'unresponsive':
        status = 'critical';
        break;
      default:
        status = 'unknown';
    }

    // Simulate response time (50-500ms for healthy, longer for others)
    const responseTime =
      status === 'healthy'
        ? Math.floor(Math.random() * 200) + 50
        : status === 'warning'
        ? Math.floor(Math.random() * 500) + 200
        : Math.floor(Math.random() * 2000) + 500;

    guardianHealth.push({
      npub: guardian.npub,
      name: guardian.name,
      status,
      lastHeartbeat: status === 'healthy' ? new Date() : undefined,
      responseTime,
      available: status === 'healthy' || status === 'warning',
    });
  }

  const availableGuardians = guardianHealth.filter((g) => g.available).length;
  const thresholdMet = availableGuardians >= threshold;

  if (!thresholdMet) {
    warnings.push(
      `Only ${availableGuardians} guardians available, but ${threshold} needed for recovery`
    );
  }

  const criticalCount = guardianHealth.filter((g) => g.status === 'critical').length;
  if (criticalCount > 0) {
    warnings.push(`${criticalCount} guardian(s) are in critical state`);
  }

  step.duration = Date.now() - startTime;
  step.details = {
    guardiansChecked: guardianHealth.length,
    healthy: guardianHealth.filter((g) => g.status === 'healthy').length,
    warning: guardianHealth.filter((g) => g.status === 'warning').length,
    critical: criticalCount,
    unknown: guardianHealth.filter((g) => g.status === 'unknown').length,
    thresholdMet,
  };

  if (!thresholdMet) {
    step.status = 'error';
    step.error = `Insufficient guardians for recovery (${availableGuardians}/${threshold})`;
  } else if (warnings.length > 0) {
    step.status = 'warning';
  } else {
    step.status = 'success';
  }

  onProgress(step);
  return { success: thresholdMet, guardiansHealthy: guardianHealth, warnings };
}

/**
 * Step 3: Simulate share generation and distribution
 */
async function simulateShareRelease(
  config: SwitchConfig,
  step: SimulationStep,
  onProgress: SimulationProgressCallback
): Promise<{
  success: boolean;
  shares: Array<{ index: number; data: string; hmac: string }>;
  testKey: Uint8Array;
}> {
  const startTime = Date.now();
  step.status = 'running';
  onProgress(step);

  const { totalShares, threshold } = config.thresholdConfig;

  try {
    // Generate test encryption key (NOT the real one)
    const testKey = await generateEncryptionKey();
    const keyBytes = await exportKey(testKey);

    // Generate auth key
    const authKeyBytes = await generateAuthKey();

    // Split into shares using real Shamir algorithm
    const shares = shamirSplit(keyBytes, totalShares, threshold);

    // Compute HMACs
    const authenticatedShares = await Promise.all(
      shares.map(async (share) => {
        const hmac = await computeShareHMAC(share, authKeyBytes);
        return {
          index: share.x,
          data: toHex(share.data),
          hmac: toHex(hmac),
        };
      })
    );

    step.duration = Date.now() - startTime;
    step.details = {
      totalSharesGenerated: authenticatedShares.length,
      thresholdRequired: threshold,
      shareIndices: authenticatedShares.map((s) => s.index),
    };
    step.status = 'success';
    onProgress(step);

    return { success: true, shares: authenticatedShares, testKey: keyBytes };
  } catch (error) {
    step.duration = Date.now() - startTime;
    step.status = 'error';
    step.error = error instanceof Error ? error.message : 'Share generation failed';
    onProgress(step);
    return { success: false, shares: [], testKey: new Uint8Array() };
  }
}

/**
 * Step 4: Simulate key reconstruction
 */
async function simulateRecovery(
  shares: Array<{ index: number; data: string }>,
  originalKey: Uint8Array,
  threshold: number,
  step: SimulationStep,
  onProgress: SimulationProgressCallback
): Promise<{ success: boolean; reconstructionTime: number }> {
  const startTime = Date.now();
  step.status = 'running';
  onProgress(step);

  try {
    // Take only threshold shares (simulating partial availability)
    const selectedShares = shares.slice(0, threshold);

    // Convert to Share objects
    const shareObjects: Share[] = selectedShares.map((s) => ({
      x: s.index,
      data: fromHex(s.data),
    }));

    // Reconstruct key using real Shamir algorithm
    const reconstructedKey = shamirCombine(shareObjects);

    // Verify reconstruction
    const keysMatch =
      reconstructedKey.length === originalKey.length &&
      reconstructedKey.every((byte, i) => byte === originalKey[i]);

    const reconstructionTime = Date.now() - startTime;

    step.duration = reconstructionTime;
    step.details = {
      sharesUsed: threshold,
      sharesAvailable: shares.length,
      reconstructionSuccessful: keysMatch,
      reconstructionTime,
    };

    if (keysMatch) {
      step.status = 'success';
    } else {
      step.status = 'error';
      step.error = 'Key reconstruction verification failed';
    }

    onProgress(step);
    return { success: keysMatch, reconstructionTime };
  } catch (error) {
    step.duration = Date.now() - startTime;
    step.status = 'error';
    step.error = error instanceof Error ? error.message : 'Recovery simulation failed';
    onProgress(step);
    return { success: false, reconstructionTime: 0 };
  }
}

// Helper to convert hex to Uint8Array
function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Step 5: Prepare recipient preview
 */
async function prepareRecipientPreview(
  config: SwitchConfig,
  step: SimulationStep,
  onProgress: SimulationProgressCallback
): Promise<{ success: boolean }> {
  const startTime = Date.now();
  step.status = 'running';
  onProgress(step);

  step.duration = Date.now() - startTime;
  step.details = {
    recipientCount: config.recipients.length,
    recipients: config.recipients.map((r) => ({
      email: r.email.replace(/(.{2}).*(@.*)/, '$1***$2'),
      name: r.name,
    })),
    notificationPreview: {
      subject: `[EchoLock] Message Released: ${config.title}`,
      hasInstructions: true,
    },
  };
  step.status = 'success';
  onProgress(step);

  return { success: true };
}

/**
 * Run complete dry run simulation
 */
export async function runDryRun(
  config: SwitchConfig,
  onProgress: SimulationProgressCallback,
  options: { queryLiveGuardians?: boolean } = {}
): Promise<SimulationResult> {
  const startedAt = new Date();
  const steps = createInitialSteps();
  const allWarnings: string[] = [];
  const allErrors: string[] = [];

  let overallSuccess = true;
  let guardiansResponded = 0;
  let testKey: Uint8Array = new Uint8Array();
  let shares: Array<{ index: number; data: string; hmac: string }> = [];

  // Step 1: Configuration Validation
  const configResult = await validateConfiguration(config, steps[0], onProgress);
  allWarnings.push(...configResult.warnings);
  allErrors.push(...configResult.errors);
  if (!configResult.success) overallSuccess = false;

  // Step 2: Guardian Health Check
  const healthResult = await checkGuardianHealth(
    config,
    steps[1],
    onProgress,
    options.queryLiveGuardians
  );
  allWarnings.push(...healthResult.warnings);
  guardiansResponded = healthResult.guardiansHealthy.filter((g) => g.available).length;
  if (!healthResult.success) overallSuccess = false;

  // Step 3: Simulate Share Release
  if (overallSuccess) {
    const shareResult = await simulateShareRelease(config, steps[2], onProgress);
    if (!shareResult.success) {
      overallSuccess = false;
      allErrors.push('Share generation simulation failed');
    } else {
      shares = shareResult.shares;
      testKey = shareResult.testKey;
    }
  } else {
    steps[2].status = 'pending';
    steps[2].description = 'Skipped due to previous errors';
    onProgress(steps[2]);
  }

  // Step 4: Simulate Recovery
  let reconstructionTime = 0;
  if (overallSuccess && shares.length > 0) {
    const recoveryResult = await simulateRecovery(
      shares,
      testKey,
      config.thresholdConfig.threshold,
      steps[3],
      onProgress
    );
    reconstructionTime = recoveryResult.reconstructionTime;
    if (!recoveryResult.success) {
      overallSuccess = false;
      allErrors.push('Key reconstruction simulation failed');
    }
  } else {
    steps[3].status = 'pending';
    steps[3].description = 'Skipped due to previous errors';
    onProgress(steps[3]);
  }

  // Step 5: Recipient Preview
  await prepareRecipientPreview(config, steps[4], onProgress);

  // Zero the test key
  testKey.fill(0);

  const completedAt = new Date();

  // Calculate estimated recovery time
  // Base time + (reconstruction time * 1.5 for network overhead) + notification time
  const estimatedRecoveryTime = overallSuccess
    ? reconstructionTime * 1.5 + 5000 + config.recipients.length * 1000
    : 0;

  return {
    steps,
    overallStatus: allErrors.length > 0 ? 'fail' : allWarnings.length > 0 ? 'warning' : 'pass',
    estimatedRecoveryTime: Math.round(estimatedRecoveryTime),
    guardiansResponded,
    guardiansTotal: config.guardians.length,
    thresholdMet: guardiansResponded >= config.thresholdConfig.threshold,
    warnings: allWarnings,
    errors: allErrors,
    startedAt,
    completedAt,
  };
}

/**
 * Format duration for display
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}
