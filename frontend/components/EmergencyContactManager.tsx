/**
 * Emergency Contact Manager Component
 *
 * Allows users to manage emergency contacts:
 * - Add/edit/remove contacts
 * - Set alert thresholds
 * - Reorder escalation chain
 * - Send test alerts
 */

'use client';

import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Mail,
  Clock,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Send,
  Bell,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { showToast } from '@/components/ui/ToastContainer';
import api from '@/lib/api';

interface EmergencyContact {
  id: string;
  name: string;
  email: string;
  alert_threshold_hours: number;
  escalation_order: number;
  is_active: boolean;
  last_notified_at?: string;
  created_at: string;
}

export default function EmergencyContactManager() {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingContact, setEditingContact] = useState<string | null>(null);
  const [sendingTest, setSendingTest] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formThreshold, setFormThreshold] = useState(12);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const response = await api.get('/api/emergency-contacts');
      setContacts(response.data.data.contacts);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
      showToast('Failed to load emergency contacts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const createContact = async () => {
    if (!formName.trim() || !formEmail.trim()) {
      showToast('Name and email are required', 'error');
      return;
    }

    try {
      const response = await api.post('/api/emergency-contacts', {
        name: formName.trim(),
        email: formEmail.trim(),
        alertThresholdHours: formThreshold,
      });

      setContacts([...contacts, response.data.data]);
      resetForm();
      showToast('Emergency contact added', 'success');
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to add contact', 'error');
    }
  };

  const updateContact = async (contactId: string) => {
    try {
      const response = await api.patch(`/api/emergency-contacts/${contactId}`, {
        name: formName.trim(),
        email: formEmail.trim(),
        alertThresholdHours: formThreshold,
      });

      setContacts(
        contacts.map((c) =>
          c.id === contactId ? { ...c, ...response.data.data } : c
        )
      );
      resetForm();
      showToast('Contact updated', 'success');
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to update contact', 'error');
    }
  };

  const deleteContact = async (contactId: string) => {
    if (!confirm('Remove this emergency contact?')) return;

    try {
      await api.delete(`/api/emergency-contacts/${contactId}`);
      setContacts(contacts.filter((c) => c.id !== contactId));
      showToast('Contact removed', 'success');
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to remove contact', 'error');
    }
  };

  const toggleActive = async (contact: EmergencyContact) => {
    try {
      await api.patch(`/api/emergency-contacts/${contact.id}`, {
        isActive: !contact.is_active,
      });

      setContacts(
        contacts.map((c) =>
          c.id === contact.id ? { ...c, is_active: !c.is_active } : c
        )
      );
      showToast(
        contact.is_active ? 'Contact deactivated' : 'Contact activated',
        'success'
      );
    } catch (error) {
      showToast('Failed to update contact', 'error');
    }
  };

  const sendTestAlert = async (contactId: string) => {
    setSendingTest(contactId);
    try {
      await api.post(`/api/emergency-contacts/${contactId}/test`);
      showToast('Test alert sent', 'success');
    } catch (error) {
      showToast('Failed to send test alert', 'error');
    } finally {
      setSendingTest(null);
    }
  };

  const moveContact = async (contactId: string, direction: 'up' | 'down') => {
    const index = contacts.findIndex((c) => c.id === contactId);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === contacts.length - 1)
    ) {
      return;
    }

    const newContacts = [...contacts];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newContacts[index], newContacts[swapIndex]] = [
      newContacts[swapIndex],
      newContacts[index],
    ];

    // Update locally first for immediate feedback
    setContacts(newContacts);

    // Then update on server
    try {
      await api.post('/api/emergency-contacts/reorder', {
        order: newContacts.map((c) => c.id),
      });
    } catch (error) {
      console.error('Failed to reorder:', error);
      // Revert on error
      fetchContacts();
    }
  };

  const startEditing = (contact: EmergencyContact) => {
    setEditingContact(contact.id);
    setFormName(contact.name);
    setFormEmail(contact.email);
    setFormThreshold(contact.alert_threshold_hours);
    setShowAddForm(false);
  };

  const resetForm = () => {
    setEditingContact(null);
    setShowAddForm(false);
    setFormName('');
    setFormEmail('');
    setFormThreshold(12);
  };

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8">
          <div className="animate-pulse text-slate-500">Loading contacts...</div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold uppercase flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Emergency Contacts
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            People to notify before your switch triggers
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            setShowAddForm(true);
            setEditingContact(null);
          }}
          disabled={contacts.length >= 10}
          className="text-sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Contact
        </Button>
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingContact) && (
        <Card>
          <h4 className="font-bold mb-3">
            {editingContact ? 'Edit Contact' : 'Add Emergency Contact'}
          </h4>
          <div className="space-y-3">
            <Input
              label="Name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g., John Smith"
            />
            <Input
              label="Email"
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder="john@example.com"
            />
            <div>
              <label className="block text-sm font-bold mb-1">
                Alert Threshold (hours before trigger)
              </label>
              <select
                value={formThreshold}
                onChange={(e) => setFormThreshold(parseInt(e.target.value))}
                className="w-full px-3 py-2 border-2 border-black rounded"
              >
                <option value={2}>2 hours</option>
                <option value={6}>6 hours</option>
                <option value={12}>12 hours (recommended)</option>
                <option value={24}>24 hours</option>
                <option value={48}>48 hours</option>
                <option value={72}>72 hours</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">
                This person will be alerted when your switch is about to trigger
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() =>
                  editingContact ? updateContact(editingContact) : createContact()
                }
              >
                {editingContact ? 'Update' : 'Add'} Contact
              </Button>
              <Button variant="secondary" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Contacts List */}
      {contacts.length === 0 ? (
        <Card>
          <div className="text-center py-8 text-slate-500">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No emergency contacts configured</p>
            <p className="text-sm mt-1">
              Add contacts to be notified before your switch triggers
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {contacts.map((contact, index) => (
            <Card
              key={contact.id}
              className={`${
                !contact.is_active ? 'opacity-50 bg-slate-50' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Reorder buttons */}
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => moveContact(contact.id, 'up')}
                    disabled={index === 0}
                    className="p-0.5 hover:bg-slate-100 rounded disabled:opacity-30"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveContact(contact.id, 'down')}
                    disabled={index === contacts.length - 1}
                    className="p-0.5 hover:bg-slate-100 rounded disabled:opacity-30"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Escalation order badge */}
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>

                {/* Contact info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold">{contact.name}</h4>
                    {!contact.is_active && (
                      <span className="text-xs px-1.5 py-0.5 bg-slate-200 rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 font-mono truncate">
                    {contact.email}
                  </p>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    Alert {contact.alert_threshold_hours}h before trigger
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => sendTestAlert(contact.id)}
                    disabled={sendingTest === contact.id}
                    className="p-2 hover:bg-blue-50 rounded"
                    title="Send test alert"
                  >
                    {sendingTest === contact.id ? (
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 text-blue-500" />
                    )}
                  </button>
                  <button
                    onClick={() => toggleActive(contact)}
                    className="p-2 hover:bg-slate-100 rounded"
                    title={contact.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {contact.is_active ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <X className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                  <button
                    onClick={() => startEditing(contact)}
                    className="p-2 hover:bg-slate-100 rounded"
                  >
                    <Edit2 className="w-4 h-4 text-slate-500" />
                  </button>
                  <button
                    onClick={() => deleteContact(contact.id)}
                    className="p-2 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Help text */}
      <p className="text-xs text-slate-500">
        Contacts are notified in order. Drag to reorder escalation chain.
        Maximum 10 contacts.
      </p>
    </div>
  );
}
