/**
 * Recipient Group Manager Component
 *
 * Allows users to:
 * - Create and manage recipient groups
 * - Add/remove recipients from groups
 * - Set custom messages per recipient
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  FolderPlus,
  Mail,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { showToast } from '@/components/ui/ToastContainer';
import api from '@/lib/api';

interface RecipientGroup {
  id: string;
  name: string;
  description?: string;
  recipientCount: number;
  created_at: string;
}

interface Recipient {
  id: string;
  email: string;
  name?: string;
  custom_message?: string;
  switch_id: string;
  switch_title?: string;
}

interface RecipientGroupManagerProps {
  onGroupSelect?: (groupId: string | null) => void;
  selectedGroupId?: string | null;
}

export default function RecipientGroupManager({
  onGroupSelect,
  selectedGroupId,
}: RecipientGroupManagerProps) {
  const [groups, setGroups] = useState<RecipientGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<RecipientGroup | null>(null);
  const [groupRecipients, setGroupRecipients] = useState<Recipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  // Fetch groups on mount
  useEffect(() => {
    fetchGroups();
  }, []);

  // Fetch recipients when group is selected
  useEffect(() => {
    if (selectedGroup) {
      fetchGroupRecipients(selectedGroup.id);
    }
  }, [selectedGroup?.id]);

  const fetchGroups = async () => {
    try {
      const response = await api.get('/api/recipient-groups');
      setGroups(response.data.data.groups);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
      showToast('Failed to load recipient groups', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupRecipients = async (groupId: string) => {
    setLoadingRecipients(true);
    try {
      const response = await api.get(`/api/recipient-groups/${groupId}`);
      setGroupRecipients(response.data.data.recipients || []);
    } catch (error) {
      console.error('Failed to fetch recipients:', error);
    } finally {
      setLoadingRecipients(false);
    }
  };

  const createGroup = async () => {
    if (!newGroupName.trim()) {
      showToast('Group name is required', 'error');
      return;
    }

    try {
      const response = await api.post('/api/recipient-groups', {
        name: newGroupName.trim(),
        description: newGroupDescription.trim() || undefined,
      });

      setGroups([...groups, response.data.data]);
      setNewGroupName('');
      setNewGroupDescription('');
      setShowCreateForm(false);
      showToast('Group created', 'success');
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to create group', 'error');
    }
  };

  const updateGroup = async (groupId: string) => {
    try {
      const response = await api.patch(`/api/recipient-groups/${groupId}`, {
        name: newGroupName.trim(),
        description: newGroupDescription.trim() || undefined,
      });

      setGroups(groups.map(g => g.id === groupId ? { ...g, ...response.data.data } : g));
      setEditingGroup(null);
      setNewGroupName('');
      setNewGroupDescription('');
      showToast('Group updated', 'success');
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to update group', 'error');
    }
  };

  const deleteGroup = async (groupId: string) => {
    if (!confirm('Delete this group? Recipients will be unlinked but not deleted.')) {
      return;
    }

    try {
      await api.delete(`/api/recipient-groups/${groupId}`);
      setGroups(groups.filter(g => g.id !== groupId));
      if (selectedGroup?.id === groupId) {
        setSelectedGroup(null);
        setGroupRecipients([]);
      }
      showToast('Group deleted', 'success');
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to delete group', 'error');
    }
  };

  const startEditing = (group: RecipientGroup) => {
    setEditingGroup(group.id);
    setNewGroupName(group.name);
    setNewGroupDescription(group.description || '');
  };

  const cancelEditing = () => {
    setEditingGroup(null);
    setNewGroupName('');
    setNewGroupDescription('');
  };

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8">
          <div className="animate-pulse text-slate-500">Loading groups...</div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold uppercase flex items-center gap-2">
          <Users className="w-5 h-5" />
          Recipient Groups
        </h3>
        <Button
          variant="secondary"
          onClick={() => setShowCreateForm(true)}
          className="text-sm"
        >
          <FolderPlus className="w-4 h-4 mr-1" />
          New Group
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card>
          <h4 className="font-bold mb-3">Create New Group</h4>
          <div className="space-y-3">
            <Input
              label="Group Name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="e.g., Family, Legal Team, Business Partners"
            />
            <Input
              label="Description (Optional)"
              value={newGroupDescription}
              onChange={(e) => setNewGroupDescription(e.target.value)}
              placeholder="What is this group for?"
            />
            <div className="flex gap-2">
              <Button onClick={createGroup}>Create Group</Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewGroupName('');
                  setNewGroupDescription('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Groups List */}
      {groups.length === 0 ? (
        <Card>
          <div className="text-center py-8 text-slate-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No recipient groups yet</p>
            <p className="text-sm mt-1">Create groups to organize recipients for cascade messages</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-3">
          {groups.map((group) => (
            <div
              key={group.id}
              onClick={() => {
                setSelectedGroup(group);
                onGroupSelect?.(group.id);
              }}
              className="cursor-pointer"
            >
              <Card
                className={`transition-all ${
                  selectedGroup?.id === group.id
                    ? 'ring-2 ring-orange-500 bg-orange-50'
                    : 'hover:bg-slate-50'
                }`}
              >
                {editingGroup === group.id ? (
                  <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                    <Input
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Group name"
                    />
                    <Input
                      value={newGroupDescription}
                      onChange={(e) => setNewGroupDescription(e.target.value)}
                      placeholder="Description"
                    />
                    <div className="flex gap-2">
                      <Button onClick={() => updateGroup(group.id)} className="text-sm">
                        <Check className="w-4 h-4 mr-1" />
                        Save
                      </Button>
                      <Button variant="secondary" onClick={cancelEditing} className="text-sm">
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold">{group.name}</h4>
                      {group.description && (
                        <p className="text-sm text-slate-500">{group.description}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        {group.recipientCount} recipient{group.recipientCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => startEditing(group)}
                        className="p-2 hover:bg-slate-100 rounded"
                      >
                        <Edit2 className="w-4 h-4 text-slate-500" />
                      </button>
                      <button
                        onClick={() => deleteGroup(group.id)}
                        className="p-2 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Selected Group Recipients */}
      {selectedGroup && (
        <Card>
          <h4 className="font-bold mb-3 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Recipients in "{selectedGroup.name}"
          </h4>
          {loadingRecipients ? (
            <div className="text-slate-500 py-4">Loading recipients...</div>
          ) : groupRecipients.length === 0 ? (
            <div className="text-slate-500 py-4 text-center">
              <p>No recipients in this group</p>
              <p className="text-sm mt-1">Add recipients during switch creation</p>
            </div>
          ) : (
            <div className="space-y-2">
              {groupRecipients.map((recipient) => (
                <div
                  key={recipient.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded border"
                >
                  <div>
                    <p className="font-medium">
                      {recipient.name || recipient.email.split('@')[0]}
                    </p>
                    <p className="text-sm text-slate-500 font-mono">{recipient.email}</p>
                    {recipient.switch_title && (
                      <p className="text-xs text-slate-400 mt-1">
                        From: {recipient.switch_title}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
