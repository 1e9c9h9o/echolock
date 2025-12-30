/**
 * Guardian Manager Component
 *
 * Allows users to manage their guardians:
 * - View current guardians and their status
 * - Add new guardians
 * - Remove guardians
 * - Monitor guardian acknowledgments
 *
 * @see CLAUDE.md - Phase 3: Guardian Network
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Check,
  X,
  Clock,
  AlertTriangle,
  Copy,
  ExternalLink,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import {
  Guardian,
  GuardianType,
  GuardianStatus,
  validateGuardianNpub,
  getDefaultGuardians,
} from '@/lib/guardian';
import { showToast } from '@/components/ui/ToastContainer';

interface GuardianManagerProps {
  switchId: string;
  guardians: Guardian[];
  onGuardiansChange: (guardians: Guardian[]) => void;
  thresholdNeeded?: number; // K in K-of-N
}

export default function GuardianManager({
  switchId,
  guardians,
  onGuardiansChange,
  thresholdNeeded = 3,
}: GuardianManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGuardianNpub, setNewGuardianNpub] = useState('');
  const [newGuardianName, setNewGuardianName] = useState('');
  const [newGuardianType, setNewGuardianType] = useState<GuardianType>('personal');

  const activeGuardians = guardians.filter((g) => g.status === 'active');
  const pendingGuardians = guardians.filter((g) => g.status === 'pending');

  const handleAddGuardian = () => {
    if (!validateGuardianNpub(newGuardianNpub)) {
      showToast('Invalid Nostr public key (must be 64 hex characters)', 'error');
      return;
    }

    if (!newGuardianName.trim()) {
      showToast('Please enter a name for the guardian', 'error');
      return;
    }

    // Check for duplicates
    if (guardians.some((g) => g.npub === newGuardianNpub)) {
      showToast('This guardian is already added', 'error');
      return;
    }

    const newGuardian: Guardian = {
      id: crypto.randomUUID(),
      type: newGuardianType,
      name: newGuardianName.trim(),
      npub: newGuardianNpub.toLowerCase(),
      status: 'pending',
      shareIndex: guardians.length + 1,
    };

    onGuardiansChange([...guardians, newGuardian]);
    setNewGuardianNpub('');
    setNewGuardianName('');
    setShowAddForm(false);
    showToast('Guardian added. Share will be distributed when you save.', 'success');
  };

  const handleRemoveGuardian = (guardianId: string) => {
    const guardian = guardians.find((g) => g.id === guardianId);
    if (!guardian) return;

    if (guardian.status === 'active') {
      if (!confirm('Removing an active guardian will require redistributing shares. Continue?')) {
        return;
      }
    }

    onGuardiansChange(guardians.filter((g) => g.id !== guardianId));
    showToast('Guardian removed', 'success');
  };

  const handleAddDefaultGuardians = () => {
    const defaults = getDefaultGuardians();
    const existingNpubs = new Set(guardians.map((g) => g.npub));
    const newGuardians = defaults.filter((d) => !existingNpubs.has(d.npub));

    if (newGuardians.length === 0) {
      showToast('Default guardians already added', 'info');
      return;
    }

    onGuardiansChange([...guardians, ...newGuardians]);
    showToast(`Added ${newGuardians.length} EchoLock guardian(s)`, 'success');
  };

  const getStatusIcon = (status: GuardianStatus) => {
    switch (status) {
      case 'active':
        return <Check className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'unresponsive':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case 'released':
        return <Shield className="w-4 h-4 text-blue" />;
      case 'revoked':
        return <X className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: GuardianStatus) => {
    switch (status) {
      case 'active':
        return 'Monitoring';
      case 'pending':
        return 'Awaiting acceptance';
      case 'unresponsive':
        return 'Unresponsive';
      case 'released':
        return 'Share released';
      case 'revoked':
        return 'Revoked';
      default:
        return status;
    }
  };

  const getTypeLabel = (type: GuardianType) => {
    switch (type) {
      case 'personal':
        return 'Personal';
      case 'professional':
        return 'Professional';
      case 'institutional':
        return 'Institutional';
      case 'self-hosted':
        return 'Self-Hosted';
      default:
        return type;
    }
  };

  const copyNpub = (npub: string) => {
    navigator.clipboard.writeText(npub);
    showToast('Public key copied', 'success');
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Guardian Network</h3>
            <p className="text-sm text-gray-600">
              {thresholdNeeded} of {guardians.length || 5} guardians needed to release
            </p>
          </div>
        </div>
      </div>

      {/* Guardian Status Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6 p-3 bg-gray-50 border-2 border-gray-200">
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">{activeGuardians.length}</p>
          <p className="text-xs text-gray-500">Active</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-yellow-600">{pendingGuardians.length}</p>
          <p className="text-xs text-gray-500">Pending</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">{guardians.length}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
      </div>

      {/* Guardian List */}
      <div className="space-y-3 mb-6">
        {guardians.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 border-2 border-dashed border-gray-300">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No guardians yet</p>
            <p className="text-sm text-gray-500">
              Add guardians to distribute your key shares
            </p>
          </div>
        ) : (
          guardians.map((guardian) => (
            <div
              key={guardian.id}
              className="flex items-center justify-between p-3 border-2 border-gray-200 hover:border-gray-300"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    guardian.type === 'institutional'
                      ? 'bg-blue-100'
                      : guardian.type === 'professional'
                      ? 'bg-purple-100'
                      : guardian.type === 'self-hosted'
                      ? 'bg-green-100'
                      : 'bg-gray-100'
                  }`}
                >
                  <span className="text-sm font-bold">{guardian.shareIndex}</span>
                </div>
                <div>
                  <p className="font-medium">{guardian.name}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="font-mono">
                      {guardian.npub.slice(0, 8)}...{guardian.npub.slice(-8)}
                    </span>
                    <button
                      onClick={() => copyNpub(guardian.npub)}
                      className="hover:text-blue"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-xs">
                  {getStatusIcon(guardian.status)}
                  <span>{getStatusLabel(guardian.status)}</span>
                </div>
                <span className="text-xs bg-gray-100 px-2 py-1">
                  {getTypeLabel(guardian.type)}
                </span>
                <button
                  onClick={() => handleRemoveGuardian(guardian.id)}
                  className="p-1 hover:bg-red-100 rounded"
                  title="Remove guardian"
                >
                  <X className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Guardian Form */}
      {showAddForm ? (
        <div className="border-2 border-blue p-4 mb-4">
          <h4 className="font-bold mb-3">Add New Guardian</h4>
          <div className="space-y-3">
            <Input
              label="Guardian Name"
              value={newGuardianName}
              onChange={(e) => setNewGuardianName(e.target.value)}
              placeholder="e.g., My Lawyer, Friend Alice"
            />
            <Input
              label="Nostr Public Key (npub hex)"
              value={newGuardianNpub}
              onChange={(e) => setNewGuardianNpub(e.target.value)}
              placeholder="64-character hex public key"
              helperText="The guardian's Nostr public key in hex format"
            />
            <div>
              <label className="block text-sm font-medium mb-2">Guardian Type</label>
              <select
                value={newGuardianType}
                onChange={(e) => setNewGuardianType(e.target.value as GuardianType)}
                className="w-full p-2 border-2 border-black"
              >
                <option value="personal">Personal (Friend/Family)</option>
                <option value="professional">Professional (Lawyer/Executor)</option>
                <option value="self-hosted">Self-Hosted (My own server)</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setShowAddForm(false)} className="flex-1">
                Cancel
              </Button>
              <Button variant="primary" onClick={handleAddGuardian} className="flex-1">
                Add Guardian
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setShowAddForm(true)}
            className="flex-1"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Custom Guardian
          </Button>
          <Button
            variant="primary"
            onClick={handleAddDefaultGuardians}
            className="flex-1"
          >
            <Shield className="w-4 h-4 mr-2" />
            Add EchoLock Guardians
          </Button>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200">
        <div className="flex gap-3">
          <Shield className="w-5 h-5 text-blue flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm text-blue-800">How Guardians Work</p>
            <p className="text-sm text-blue-700 mt-1">
              Your encryption key is split into shares using Shamir's Secret Sharing.
              Each guardian holds one share. When you miss your heartbeat threshold,
              guardians independently release their shares. Recipients need {thresholdNeeded}+
              shares to reconstruct the key and decrypt your message.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
