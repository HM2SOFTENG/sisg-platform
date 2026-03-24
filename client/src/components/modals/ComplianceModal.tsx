'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  Loader2,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
const genId = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export interface ComplianceModalData {
  itemKey: string;
  status: 'verify' | 'ready' | 'action_needed' | 'complete';
  verificationSteps: {
    id: string;
    description: string;
    completed: boolean;
    responsibleParty: string;
  }[];
  documents: {
    id: string;
    name: string;
    status: 'missing' | 'draft' | 'under_review' | 'approved';
    date: string;
  }[];
  signoffs: {
    id: string;
    approver: string;
    role: string;
    status: 'pending' | 'approved' | 'rejected';
    date: string;
    notes: string;
  }[];
  actionItems: {
    id: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    assignee: string;
    dueDate: string;
    completed: boolean;
  }[];
  notes: string;
}

interface ComplianceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ComplianceModalData) => void;
  itemName: string;
  itemKey: string;
  itemIndex: number;
  required: boolean;
  opportunity: any;
  initialData?: ComplianceModalData | null;
}

const ComplianceModal: React.FC<ComplianceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  itemName,
  itemKey,
  itemIndex,
  required,
  opportunity,
  initialData,
}) => {
  const [data, setData] = useState<ComplianceModalData>(
    initialData || {
      itemKey,
      status: 'verify',
      verificationSteps: [],
      documents: [],
      signoffs: [],
      actionItems: [],
      notes: '',
    }
  );

  const [aiLoading, setAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('steps');

  useEffect(() => {
    if (initialData) {
      setData(initialData);
    }
  }, [initialData, isOpen]);

  const token = typeof window !== 'undefined' ? localStorage.getItem('sisg_admin_token') : null;

  const handleAiAssist = useCallback(async () => {
    setAiLoading(true);
    try {
      const response = await fetch('/api/admin/agents/modal/ai-assist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'compliance',
          itemName,
          required,
          opportunityTitle: opportunity?.title,
          naicsCode: opportunity?.naicsCode,
          setAside: opportunity?.setAside,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate AI assistance');
      }

      const aiData = await response.json();

      setData((prev) => ({
        ...prev,
        verificationSteps: aiData.verificationSteps || prev.verificationSteps,
        documents: aiData.documents || prev.documents,
        actionItems: aiData.actionItems || prev.actionItems,
        notes: aiData.guidance || prev.notes,
      }));

      toast.success('AI assistance applied successfully');
    } catch (error) {
      toast.error('Failed to apply AI assistance');
      console.error(error);
    } finally {
      setAiLoading(false);
    }
  }, [token, itemName, required, opportunity]);

  const cycleStatus = useCallback(() => {
    const statusCycle: (typeof data.status)[] = [
      'verify',
      'ready',
      'complete',
      'action_needed',
    ];
    const currentIndex = statusCycle.indexOf(data.status);
    const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length];
    setData((prev) => ({ ...prev, status: nextStatus }));
  }, [data.status]);

  const addVerificationStep = useCallback(() => {
    const newStep = {
      id: genId(),
      description: '',
      completed: false,
      responsibleParty: 'Contracts Manager',
    };
    setData((prev) => ({
      ...prev,
      verificationSteps: [...prev.verificationSteps, newStep],
    }));
  }, []);

  const updateVerificationStep = useCallback(
    (id: string, field: string, value: any) => {
      setData((prev) => ({
        ...prev,
        verificationSteps: prev.verificationSteps.map((step) =>
          step.id === id ? { ...step, [field]: value } : step
        ),
      }));
    },
    []
  );

  const deleteVerificationStep = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      verificationSteps: prev.verificationSteps.filter((step) => step.id !== id),
    }));
  }, []);

  const addDocument = useCallback(() => {
    const newDoc = {
      id: genId(),
      name: '',
      status: 'missing' as const,
      date: new Date().toISOString().split('T')[0],
    };
    setData((prev) => ({
      ...prev,
      documents: [...prev.documents, newDoc],
    }));
  }, []);

  const updateDocument = useCallback((id: string, field: string, value: any) => {
    setData((prev) => ({
      ...prev,
      documents: prev.documents.map((doc) =>
        doc.id === id ? { ...doc, [field]: value } : doc
      ),
    }));
  }, []);

  const deleteDocument = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      documents: prev.documents.filter((doc) => doc.id !== id),
    }));
  }, []);

  const addSignoff = useCallback(() => {
    const newSignoff = {
      id: genId(),
      approver: '',
      role: '',
      status: 'pending' as const,
      date: new Date().toISOString().split('T')[0],
      notes: '',
    };
    setData((prev) => ({
      ...prev,
      signoffs: [...prev.signoffs, newSignoff],
    }));
  }, []);

  const updateSignoff = useCallback((id: string, field: string, value: any) => {
    setData((prev) => ({
      ...prev,
      signoffs: prev.signoffs.map((signoff) =>
        signoff.id === id ? { ...signoff, [field]: value } : signoff
      ),
    }));
  }, []);

  const deleteSignoff = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      signoffs: prev.signoffs.filter((signoff) => signoff.id !== id),
    }));
  }, []);

  const addActionItem = useCallback(() => {
    const newItem = {
      id: genId(),
      description: '',
      priority: 'medium' as const,
      assignee: '',
      dueDate: new Date().toISOString().split('T')[0],
      completed: false,
    };
    setData((prev) => ({
      ...prev,
      actionItems: [...prev.actionItems, newItem],
    }));
  }, []);

  const updateActionItem = useCallback((id: string, field: string, value: any) => {
    setData((prev) => ({
      ...prev,
      actionItems: prev.actionItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  }, []);

  const deleteActionItem = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      actionItems: prev.actionItems.filter((item) => item.id !== id),
    }));
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
        return '#00e5a0';
      case 'ready':
        return '#0066ff';
      case 'action_needed':
        return '#ffb800';
      case 'verify':
      default:
        return '#8b5cf6';
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'complete':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
      case 'ready':
        return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
      case 'action_needed':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      case 'verify':
      default:
        return 'bg-purple-500/10 border-purple-500/30 text-purple-400';
    }
  };

  const stepProgress =
    data.verificationSteps.length > 0
      ? (data.verificationSteps.filter((s) => s.completed).length /
          data.verificationSteps.length) *
        100
      : 0;

  const completedSignoffs = data.signoffs.filter((s) => s.status === 'approved').length;
  const signoffProgress =
    data.signoffs.length > 0 ? (completedSignoffs / data.signoffs.length) * 100 : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-white/5 bg-[#0a0a1a] shadow-2xl"
          >
            {/* Header */}
            <div className="sticky top-0 z-40 bg-[#0a0a1a]/95 backdrop-blur border-b border-white/5 px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-semibold text-white">{itemName}</h2>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium border ${required ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-blue-500/10 border-blue-500/30 text-blue-400'}`}
                    >
                      {required ? 'Required' : 'Optional'}
                    </span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium border capitalize ${getStatusBadgeStyle(data.status)}`}
                    >
                      {data.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-white/50">{itemKey}</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-white/5 rounded transition-colors"
                >
                  <X className="w-5 h-5 text-white/60 hover:text-white" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="sticky top-[68px] z-30 bg-[#0a0a1a]/90 backdrop-blur border-b border-white/5 px-6">
              <div className="flex gap-6 -mb-px">
                {['steps', 'documents', 'signoffs', 'actions', 'notes'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab === tab ? 'border-blue-500 text-blue-400' : 'border-transparent text-white/60 hover:text-white/80'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Verification Steps Tab */}
              {activeTab === 'steps' && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-white">Verification Steps</h3>
                      <span className="text-xs text-white/50">
                        {Math.round(stepProgress)}% complete
                      </span>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${stepProgress}%` }}
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    {data.verificationSteps.map((step) => (
                      <motion.div
                        key={step.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/[0.02] border border-white/5 rounded-lg p-4 hover:bg-white/[0.03] transition-colors"
                      >
                        <div className="flex gap-3">
                          <input
                            type="checkbox"
                            checked={step.completed}
                            onChange={(e) =>
                              updateVerificationStep(step.id, 'completed', e.target.checked)
                            }
                            className="mt-1 w-4 h-4 rounded accent-blue-500 flex-shrink-0"
                          />
                          <div className="flex-1">
                            <input
                              type="text"
                              value={step.description}
                              onChange={(e) =>
                                updateVerificationStep(step.id, 'description', e.target.value)
                              }
                              placeholder="Step description..."
                              className="w-full bg-[#1a1a2e] text-white text-sm px-3 py-2 rounded border border-white/5 focus:border-blue-500/50 focus:outline-none mb-2"
                            />
                            <select
                              value={step.responsibleParty}
                              onChange={(e) =>
                                updateVerificationStep(step.id, 'responsibleParty', e.target.value)
                              }
                              className="w-full bg-[#1a1a2e] text-white text-sm px-3 py-2 rounded border border-white/5 focus:border-blue-500/50 focus:outline-none [&>option]:bg-[#1a1a2e] [&>option]:text-white"
                            >
                              <option>Contracts Manager</option>
                              <option>Legal</option>
                              <option>Technical Lead</option>
                              <option>Compliance Officer</option>
                              <option>Custom</option>
                            </select>
                          </div>
                          <button
                            onClick={() => deleteVerificationStep(step.id)}
                            className="p-1 hover:bg-red-500/10 rounded transition-colors flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <button
                    onClick={addVerificationStep}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded border border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5 text-white/70 hover:text-blue-400 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">Add Step</span>
                  </button>
                </div>
              )}

              {/* Documents Tab */}
              {activeTab === 'documents' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-white">Document Tracking</h3>

                  <div className="space-y-3">
                    {data.documents.map((doc) => (
                      <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/[0.02] border border-white/5 rounded-lg p-4 hover:bg-white/[0.03] transition-colors"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <input
                            type="text"
                            value={doc.name}
                            onChange={(e) => updateDocument(doc.id, 'name', e.target.value)}
                            placeholder="Document name..."
                            className="bg-[#1a1a2e] text-white text-sm px-3 py-2 rounded border border-white/5 focus:border-blue-500/50 focus:outline-none"
                          />
                          <select
                            value={doc.status}
                            onChange={(e) =>
                              updateDocument(doc.id, 'status', e.target.value as any)
                            }
                            className="bg-[#1a1a2e] text-white text-sm px-3 py-2 rounded border border-white/5 focus:border-blue-500/50 focus:outline-none [&>option]:bg-[#1a1a2e] [&>option]:text-white"
                          >
                            <option value="missing">Missing</option>
                            <option value="draft">Draft</option>
                            <option value="under_review">Under Review</option>
                            <option value="approved">Approved</option>
                          </select>
                          <div className="flex gap-2">
                            <input
                              type="date"
                              value={doc.date}
                              onChange={(e) => updateDocument(doc.id, 'date', e.target.value)}
                              className="flex-1 bg-[#1a1a2e] text-white text-sm px-3 py-2 rounded border border-white/5 focus:border-blue-500/50 focus:outline-none"
                            />
                            <button
                              onClick={() => deleteDocument(doc.id)}
                              className="p-2 hover:bg-red-500/10 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <button
                    onClick={addDocument}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded border border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5 text-white/70 hover:text-blue-400 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">Add Document</span>
                  </button>
                </div>
              )}

              {/* Sign-offs Tab */}
              {activeTab === 'signoffs' && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-white">Sign-off Tracking</h3>
                      <span className="text-xs text-white/50">
                        {Math.round(signoffProgress)}% approved
                      </span>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${signoffProgress}%` }}
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    {data.signoffs.map((signoff) => (
                      <motion.div
                        key={signoff.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/[0.02] border border-white/5 rounded-lg p-4 hover:bg-white/[0.03] transition-colors"
                      >
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input
                              type="text"
                              value={signoff.approver}
                              onChange={(e) =>
                                updateSignoff(signoff.id, 'approver', e.target.value)
                              }
                              placeholder="Approver name..."
                              className="bg-[#1a1a2e] text-white text-sm px-3 py-2 rounded border border-white/5 focus:border-blue-500/50 focus:outline-none"
                            />
                            <input
                              type="text"
                              value={signoff.role}
                              onChange={(e) => updateSignoff(signoff.id, 'role', e.target.value)}
                              placeholder="Role/Title..."
                              className="bg-[#1a1a2e] text-white text-sm px-3 py-2 rounded border border-white/5 focus:border-blue-500/50 focus:outline-none"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <select
                              value={signoff.status}
                              onChange={(e) =>
                                updateSignoff(signoff.id, 'status', e.target.value as any)
                              }
                              className="bg-[#1a1a2e] text-white text-sm px-3 py-2 rounded border border-white/5 focus:border-blue-500/50 focus:outline-none [&>option]:bg-[#1a1a2e] [&>option]:text-white"
                            >
                              <option value="pending">Pending</option>
                              <option value="approved">Approved</option>
                              <option value="rejected">Rejected</option>
                            </select>
                            <input
                              type="date"
                              value={signoff.date}
                              onChange={(e) => updateSignoff(signoff.id, 'date', e.target.value)}
                              className="bg-[#1a1a2e] text-white text-sm px-3 py-2 rounded border border-white/5 focus:border-blue-500/50 focus:outline-none"
                            />
                            <button
                              onClick={() => deleteSignoff(signoff.id)}
                              className="p-2 hover:bg-red-500/10 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            {signoff.status === 'approved' && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            )}
                            {signoff.status === 'pending' && (
                              <Clock className="w-4 h-4 text-amber-400" />
                            )}
                            {signoff.status === 'rejected' && (
                              <AlertCircle className="w-4 h-4 text-red-400" />
                            )}
                            <input
                              type="text"
                              value={signoff.notes}
                              onChange={(e) => updateSignoff(signoff.id, 'notes', e.target.value)}
                              placeholder="Notes..."
                              className="flex-1 bg-[#1a1a2e] text-white text-sm px-3 py-2 rounded border border-white/5 focus:border-blue-500/50 focus:outline-none"
                            />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <button
                    onClick={addSignoff}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded border border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5 text-white/70 hover:text-blue-400 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">Add Approver</span>
                  </button>
                </div>
              )}

              {/* Action Items Tab */}
              {activeTab === 'actions' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-white">Action Items</h3>

                  <div className="space-y-3">
                    {data.actionItems.map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/[0.02] border border-white/5 rounded-lg p-4 hover:bg-white/[0.03] transition-colors"
                      >
                        <div className="space-y-3">
                          <div className="flex gap-3">
                            <input
                              type="checkbox"
                              checked={item.completed}
                              onChange={(e) =>
                                updateActionItem(item.id, 'completed', e.target.checked)
                              }
                              className="mt-1 w-4 h-4 rounded accent-blue-500 flex-shrink-0"
                            />
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) =>
                                updateActionItem(item.id, 'description', e.target.value)
                              }
                              placeholder="Action description..."
                              className="flex-1 bg-[#1a1a2e] text-white text-sm px-3 py-2 rounded border border-white/5 focus:border-blue-500/50 focus:outline-none"
                            />
                            <button
                              onClick={() => deleteActionItem(item.id)}
                              className="p-1 hover:bg-red-500/10 rounded transition-colors flex-shrink-0"
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <select
                              value={item.priority}
                              onChange={(e) =>
                                updateActionItem(item.id, 'priority', e.target.value as any)
                              }
                              className="bg-[#1a1a2e] text-white text-sm px-3 py-2 rounded border border-white/5 focus:border-blue-500/50 focus:outline-none [&>option]:bg-[#1a1a2e] [&>option]:text-white"
                            >
                              <option value="high">High Priority</option>
                              <option value="medium">Medium Priority</option>
                              <option value="low">Low Priority</option>
                            </select>
                            <input
                              type="text"
                              value={item.assignee}
                              onChange={(e) =>
                                updateActionItem(item.id, 'assignee', e.target.value)
                              }
                              placeholder="Assignee..."
                              className="bg-[#1a1a2e] text-white text-sm px-3 py-2 rounded border border-white/5 focus:border-blue-500/50 focus:outline-none"
                            />
                            <input
                              type="date"
                              value={item.dueDate}
                              onChange={(e) =>
                                updateActionItem(item.id, 'dueDate', e.target.value)
                              }
                              className="bg-[#1a1a2e] text-white text-sm px-3 py-2 rounded border border-white/5 focus:border-blue-500/50 focus:outline-none"
                            />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <button
                    onClick={addActionItem}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded border border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5 text-white/70 hover:text-blue-400 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">Add Action Item</span>
                  </button>
                </div>
              )}

              {/* Notes Tab */}
              {activeTab === 'notes' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">Notes & Guidance</h3>
                    <button
                      onClick={handleAiAssist}
                      disabled={aiLoading}
                      className="flex items-center gap-2 px-3 py-1 rounded text-xs bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500/20 disabled:opacity-50 transition-colors"
                    >
                      {aiLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Zap className="w-3 h-3" />
                      )}
                      Generate Guidance
                    </button>
                  </div>

                  <textarea
                    value={data.notes}
                    onChange={(e) => setData((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Add notes, guidance, or compliance details..."
                    className="w-full h-64 bg-[#1a1a2e] text-white text-sm px-3 py-2 rounded border border-white/5 focus:border-blue-500/50 focus:outline-none resize-none"
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-[#0a0a1a]/95 backdrop-blur border-t border-white/5 px-6 py-4 flex items-center justify-between gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleAiAssist}
                  disabled={aiLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded text-sm bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500/20 disabled:opacity-50 transition-colors"
                >
                  {aiLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  Auto-Fill All
                </button>

                <button
                  onClick={cycleStatus}
                  className="px-4 py-2 rounded text-sm border border-white/10 text-white/70 hover:text-white hover:border-white/20 transition-colors capitalize"
                >
                  Status: {data.status.replace('_', ' ')}
                </button>

                <button
                  onClick={() => {
                    onSave(data);
                    onClose();
                  }}
                  className="px-4 py-2 rounded text-sm bg-blue-500/20 border border-blue-500/50 text-blue-400 hover:bg-blue-500/30 transition-colors font-medium"
                >
                  Save
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ComplianceModal;
