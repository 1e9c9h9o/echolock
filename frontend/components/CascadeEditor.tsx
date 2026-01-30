/**
 * Cascade Editor Component
 *
 * Allows users to create time-delayed cascade messages:
 * - Add multiple messages with different delays
 * - Assign recipient groups to each message
 * - Visualize release timeline
 */

'use client';

import { useState } from 'react';
import {
  Clock,
  Plus,
  Trash2,
  GripVertical,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { showToast } from '@/components/ui/ToastContainer';

interface RecipientGroup {
  id: string;
  name: string;
}

interface CascadeMessage {
  id: string;
  delayHours: number;
  recipientGroupId?: string;
  message: string;
  sortOrder: number;
}

interface CascadeEditorProps {
  cascadeMessages: CascadeMessage[];
  onCascadeChange: (messages: CascadeMessage[]) => void;
  recipientGroups: RecipientGroup[];
  disabled?: boolean;
}

export default function CascadeEditor({
  cascadeMessages,
  onCascadeChange,
  recipientGroups,
  disabled = false,
}: CascadeEditorProps) {
  const [expandedMessage, setExpandedMessage] = useState<string | null>(null);

  const addCascadeMessage = () => {
    const maxDelay = cascadeMessages.reduce((max, m) => Math.max(max, m.delayHours), 0);
    const newMessage: CascadeMessage = {
      id: crypto.randomUUID(),
      delayHours: maxDelay + 24,
      message: '',
      sortOrder: cascadeMessages.length,
    };
    onCascadeChange([...cascadeMessages, newMessage]);
    setExpandedMessage(newMessage.id);
  };

  const updateMessage = (id: string, updates: Partial<CascadeMessage>) => {
    onCascadeChange(
      cascadeMessages.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      )
    );
  };

  const removeMessage = (id: string) => {
    onCascadeChange(cascadeMessages.filter((m) => m.id !== id));
    if (expandedMessage === id) {
      setExpandedMessage(null);
    }
  };

  const moveMessage = (id: string, direction: 'up' | 'down') => {
    const index = cascadeMessages.findIndex((m) => m.id === id);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === cascadeMessages.length - 1)
    ) {
      return;
    }

    const newMessages = [...cascadeMessages];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newMessages[index], newMessages[swapIndex]] = [
      newMessages[swapIndex],
      newMessages[index],
    ];

    // Update sort orders
    newMessages.forEach((m, i) => {
      m.sortOrder = i;
    });

    onCascadeChange(newMessages);
  };

  const formatDelay = (hours: number): string => {
    if (hours === 0) return 'Immediate';
    if (hours < 24) return `+${hours} hour${hours !== 1 ? 's' : ''}`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (remainingHours === 0) return `+${days} day${days !== 1 ? 's' : ''}`;
    return `+${days}d ${remainingHours}h`;
  };

  const sortedMessages = [...cascadeMessages].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold uppercase flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Cascade Messages
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Release different messages at different times after trigger
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={addCascadeMessage}
          disabled={disabled || cascadeMessages.length >= 10}
          className="text-sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Message
        </Button>
      </div>

      {/* Timeline visualization */}
      {sortedMessages.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto py-2">
          {sortedMessages.map((msg, index) => (
            <div key={msg.id} className="flex items-center">
              <div
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  index === 0
                    ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300'
                    : 'bg-slate-100 text-slate-600 border border-slate-300'
                }`}
              >
                {formatDelay(msg.delayHours)}
                {msg.recipientGroupId && (
                  <span className="ml-1 text-slate-400">
                    ({recipientGroups.find((g) => g.id === msg.recipientGroupId)?.name || 'Group'})
                  </span>
                )}
              </div>
              {index < sortedMessages.length - 1 && (
                <div className="w-8 h-0.5 bg-slate-300 mx-1" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Messages list */}
      {sortedMessages.length === 0 ? (
        <Card>
          <div className="text-center py-8 text-slate-500">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No cascade messages configured</p>
            <p className="text-sm mt-1">
              Add messages to release at different times after trigger
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedMessages.map((msg, index) => (
            <Card
              key={msg.id}
              className={expandedMessage === msg.id ? 'ring-2 ring-orange-500' : ''}
            >
              {/* Message header */}
              <div
                className="flex items-center gap-3 cursor-pointer"
                onClick={() =>
                  setExpandedMessage(expandedMessage === msg.id ? null : msg.id)
                }
              >
                <div className="flex flex-col gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveMessage(msg.id, 'up');
                    }}
                    disabled={index === 0 || disabled}
                    className="p-0.5 hover:bg-slate-100 rounded disabled:opacity-30"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveMessage(msg.id, 'down');
                    }}
                    disabled={index === sortedMessages.length - 1 || disabled}
                    className="p-0.5 hover:bg-slate-100 rounded disabled:opacity-30"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        msg.delayHours === 0
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {formatDelay(msg.delayHours)}
                    </span>
                    {msg.recipientGroupId && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {recipientGroups.find((g) => g.id === msg.recipientGroupId)?.name}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1 truncate">
                    {msg.message || 'No message content yet'}
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeMessage(msg.id);
                  }}
                  disabled={disabled}
                  className="p-2 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>

              {/* Expanded content */}
              {expandedMessage === msg.id && (
                <div className="mt-4 pt-4 border-t space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold mb-1">Delay (hours)</label>
                      <input
                        type="number"
                        min="0"
                        max="8760"
                        value={msg.delayHours}
                        onChange={(e) =>
                          updateMessage(msg.id, {
                            delayHours: parseInt(e.target.value) || 0,
                          })
                        }
                        disabled={disabled}
                        className="w-full px-3 py-2 border-2 border-black rounded font-mono"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        0 = immediate, 24 = 1 day, 168 = 1 week
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-bold mb-1">Recipient Group</label>
                      <select
                        value={msg.recipientGroupId || ''}
                        onChange={(e) =>
                          updateMessage(msg.id, {
                            recipientGroupId: e.target.value || undefined,
                          })
                        }
                        disabled={disabled}
                        className="w-full px-3 py-2 border-2 border-black rounded"
                      >
                        <option value="">All recipients</option>
                        {recipientGroups.map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-1">Message</label>
                    <textarea
                      value={msg.message}
                      onChange={(e) =>
                        updateMessage(msg.id, { message: e.target.value })
                      }
                      disabled={disabled}
                      placeholder="Enter the message content for this cascade step..."
                      rows={4}
                      className="w-full px-3 py-2 border-2 border-black rounded font-mono resize-none"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      This message will be released {formatDelay(msg.delayHours).toLowerCase()} after trigger
                    </p>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Help text */}
      <p className="text-xs text-slate-500">
        Example cascade: Immediate to family, +24h to lawyer, +7 days to public.
        Maximum 10 cascade messages.
      </p>
    </div>
  );
}
