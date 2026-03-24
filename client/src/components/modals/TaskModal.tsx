import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Plus, Trash2, Loader, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export interface TaskModalData {
  taskKey: string;
  completed: boolean;
  subtasks: { id: string; title: string; completed: boolean }[];
  notes: string;
  assignee: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  estimatedHours: number;
  status: 'not_started' | 'in_progress' | 'blocked' | 'complete';
  attachments: string[];
}

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TaskModalData) => void;
  taskName: string;
  taskKey: string;
  phaseName: string;
  phaseIndex: number;
  taskIndex: number;
  opportunity: any;
  initialData?: TaskModalData | null;
}

const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  taskName,
  taskKey,
  phaseName,
  phaseIndex,
  taskIndex,
  opportunity,
  initialData,
}) => {
  // State for modal data
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>(
    initialData?.priority || 'medium'
  );
  const [status, setStatus] = useState<'not_started' | 'in_progress' | 'blocked' | 'complete'>(
    initialData?.status || 'not_started'
  );
  const [subtasks, setSubtasks] = useState(
    initialData?.subtasks || []
  );
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [assignee, setAssignee] = useState(initialData?.assignee || '');
  const [dueDate, setDueDate] = useState(initialData?.dueDate || '');
  const [estimatedHours, setEstimatedHours] = useState(initialData?.estimatedHours || 0);
  const [attachments, setAttachments] = useState(initialData?.attachments || []);
  const [completed, setCompleted] = useState(initialData?.completed || false);

  // AI assist state
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [attachmentInput, setAttachmentInput] = useState('');
  const [showAttachmentInput, setShowAttachmentInput] = useState(false);

  // Generate unique IDs for subtasks
  const generateSubtaskId = () => `subtask-${Date.now()}-${Math.random()}`;

  // Handle subtask toggle
  const toggleSubtask = (id: string) => {
    setSubtasks((prev) =>
      prev.map((st) => (st.id === id ? { ...st, completed: !st.completed } : st))
    );
  };

  // Handle subtask title change
  const updateSubtaskTitle = (id: string, title: string) => {
    setSubtasks((prev) =>
      prev.map((st) => (st.id === id ? { ...st, title } : st))
    );
  };

  // Delete subtask
  const deleteSubtask = (id: string) => {
    setSubtasks((prev) => prev.filter((st) => st.id !== id));
  };

  // Add new subtask
  const addSubtask = () => {
    setSubtasks((prev) => [
      ...prev,
      { id: generateSubtaskId(), title: 'New subtask', completed: false },
    ]);
  };

  // Add attachment
  const addAttachment = () => {
    if (attachmentInput.trim()) {
      setAttachments((prev) => [...prev, attachmentInput.trim()]);
      setAttachmentInput('');
      setShowAttachmentInput(false);
    }
  };

  // Delete attachment
  const deleteAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculate subtask progress
  const completedSubtasks = subtasks.filter((st) => st.completed).length;
  const subtaskProgress =
    subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : 0;

  // AI Auto-Fill All
  const handleAutoFill = async () => {
    setIsLoadingAI(true);
    try {
      const token = localStorage.getItem('sisg_admin_token');
      if (!token) {
        toast.error('Authentication token not found');
        setIsLoadingAI(false);
        return;
      }

      const response = await fetch('/api/admin/agents/modal/ai-assist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'task',
          taskName,
          phaseName,
          opportunityTitle: opportunity?.title || opportunity?.opportunityTitle || '',
          naicsCode: opportunity?.naicsCode || '',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate AI assistance');
      }

      const data = await response.json();

      // Update state with AI-generated data
      if (data.subtasks && Array.isArray(data.subtasks)) {
        const newSubtasks = data.subtasks.map((title: string) => ({
          id: generateSubtaskId(),
          title,
          completed: false,
        }));
        setSubtasks(newSubtasks);
      }

      if (data.notes) {
        setNotes((prev) => (prev ? `${prev}\n\n${data.notes}` : data.notes));
      }

      if (data.assignee) {
        setAssignee(data.assignee);
      }

      if (data.estimatedHours) {
        setEstimatedHours(data.estimatedHours);
      }

      toast.success('AI assistance generated successfully');
    } catch (error) {
      console.error('AI assist error:', error);
      toast.error('Failed to generate AI assistance');
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Generate notes with AI
  const handleGenerateNotes = async () => {
    setIsLoadingAI(true);
    try {
      const token = localStorage.getItem('sisg_admin_token');
      if (!token) {
        toast.error('Authentication token not found');
        setIsLoadingAI(false);
        return;
      }

      const response = await fetch('/api/admin/agents/modal/ai-assist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'notes',
          taskName,
          phaseName,
          opportunityTitle: opportunity?.title || opportunity?.opportunityTitle || '',
          naicsCode: opportunity?.naicsCode || '',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate notes');
      }

      const data = await response.json();

      if (data.notes) {
        setNotes((prev) => (prev ? `${prev}\n\n${data.notes}` : data.notes));
        toast.success('Notes generated successfully');
      }
    } catch (error) {
      console.error('Generate notes error:', error);
      toast.error('Failed to generate notes');
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Handle save
  const handleSave = () => {
    const modalData: TaskModalData = {
      taskKey,
      completed,
      subtasks,
      notes,
      assignee,
      dueDate,
      priority,
      estimatedHours,
      status,
      attachments,
    };

    onSave(modalData);
    toast.success('Task saved successfully');
    onClose();
  };

  // Handle mark complete
  const handleMarkComplete = () => {
    setCompleted(true);
    setStatus('complete');
    toast.success('Task marked as complete');
  };

  // Get priority color
  const getPriorityColor = (p: 'high' | 'medium' | 'low') => {
    switch (p) {
      case 'high':
        return '#ff4444';
      case 'medium':
        return '#ffb800';
      case 'low':
        return '#00e5a0';
      default:
        return '#8b5cf6';
    }
  };

  // Get status color
  const getStatusColor = (s: string) => {
    switch (s) {
      case 'complete':
        return '#00e5a0';
      case 'in_progress':
        return '#0066ff';
      case 'blocked':
        return '#ff4444';
      default:
        return '#8b5cf6';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-[#0a0a1a] border border-white/5 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-[#0a0a1a] border-b border-white/5 p-6 flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-2">{taskName}</h2>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm text-white/60">{phaseName}</span>
                    <div className="flex items-center gap-2">
                      <select
                        value={priority}
                        onChange={(e) =>
                          setPriority(e.target.value as 'high' | 'medium' | 'low')
                        }
                        className="px-2 py-1 text-xs font-semibold rounded bg-[#1a1a2e] text-white border border-white/10 cursor-pointer [&>option]:bg-[#1a1a2e] [&>option]:text-white"
                        style={{
                          color: getPriorityColor(priority),
                        }}
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                      <span
                        className="px-2 py-1 text-xs font-semibold rounded bg-white/5 border border-white/10"
                        style={{
                          color: getStatusColor(status),
                        }}
                      >
                        {status.replace(/_/g, ' ').charAt(0).toUpperCase() +
                          status.replace(/_/g, ' ').slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-white/40 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Subtasks Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Subtasks</h3>
                    <span className="text-sm text-white/60">
                      {completedSubtasks} / {subtasks.length}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  {subtasks.length > 0 && (
                    <div className="mb-4 bg-white/5 rounded-full h-2 overflow-hidden border border-white/10">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${subtaskProgress}%` }}
                        transition={{ duration: 0.3 }}
                        className="h-full bg-gradient-to-r from-[#0066ff] to-[#00e5a0]"
                      />
                    </div>
                  )}

                  {/* Subtasks List */}
                  <div className="space-y-2 mb-4">
                    {subtasks.map((subtask) => (
                      <div
                        key={subtask.id}
                        className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-lg hover:bg-white/[0.03] transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={subtask.completed}
                          onChange={() => toggleSubtask(subtask.id)}
                          className="w-4 h-4 cursor-pointer accent-[#0066ff]"
                        />
                        <input
                          type="text"
                          value={subtask.title}
                          onChange={(e) => updateSubtaskTitle(subtask.id, e.target.value)}
                          className="flex-1 bg-transparent text-white placeholder-white/40 outline-none"
                          style={{
                            textDecoration: subtask.completed ? 'line-through' : 'none',
                            opacity: subtask.completed ? 0.6 : 1,
                          }}
                        />
                        <button
                          onClick={() => deleteSubtask(subtask.id)}
                          className="text-white/40 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add Subtask Button */}
                  <button
                    onClick={addSubtask}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                  >
                    <Plus size={16} />
                    Add Subtask
                  </button>
                </div>

                {/* Notes Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white">Notes</h3>
                    <button
                      onClick={handleGenerateNotes}
                      disabled={isLoadingAI}
                      className="flex items-center gap-2 px-3 py-1 text-sm text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded transition-colors disabled:opacity-50"
                    >
                      {isLoadingAI ? <Loader size={14} className="animate-spin" /> : null}
                      Generate Notes
                    </button>
                  </div>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes, observations, requirements..."
                    className="w-full px-4 py-3 bg-white/[0.02] border border-white/5 rounded-lg text-white placeholder-white/40 outline-none focus:border-white/20 focus:bg-white/[0.04] transition-colors resize-none"
                    rows={4}
                  />
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Assignee */}
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Assignee
                    </label>
                    <select
                      value={assignee}
                      onChange={(e) => setAssignee(e.target.value)}
                      className="w-full px-3 py-2 bg-[#1a1a2e] border border-white/10 rounded-lg text-white outline-none focus:border-white/20 transition-colors [&>option]:bg-[#1a1a2e] [&>option]:text-white"
                    >
                      <option value="">Select assignee</option>
                      <option value="Project Manager">Project Manager</option>
                      <option value="Technical Lead">Technical Lead</option>
                      <option value="Contracts Specialist">Contracts Specialist</option>
                      <option value="Subject Matter Expert">Subject Matter Expert</option>
                      <option value="Custom">Custom</option>
                    </select>
                    {assignee === 'Custom' && (
                      <input
                        type="text"
                        placeholder="Enter custom assignee"
                        onChange={(e) => setAssignee(e.target.value)}
                        className="w-full px-3 py-2 mt-2 bg-white/[0.02] border border-white/5 rounded-lg text-white placeholder-white/40 outline-none focus:border-white/20"
                      />
                    )}
                  </div>

                  {/* Due Date */}
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3 py-2 bg-[#1a1a2e] border border-white/10 rounded-lg text-white outline-none focus:border-white/20 transition-colors [&]:text-white"
                    />
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) =>
                        setPriority(e.target.value as 'high' | 'medium' | 'low')
                      }
                      className="w-full px-3 py-2 bg-[#1a1a2e] border border-white/10 rounded-lg text-white outline-none focus:border-white/20 transition-colors [&>option]:bg-[#1a1a2e] [&>option]:text-white"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  {/* Estimated Hours */}
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Estimated Hours
                    </label>
                    <input
                      type="number"
                      value={estimatedHours}
                      onChange={(e) => setEstimatedHours(parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.5"
                      className="w-full px-3 py-2 bg-[#1a1a2e] border border-white/10 rounded-lg text-white outline-none focus:border-white/20 transition-colors"
                    />
                  </div>

                  {/* Status */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) =>
                        setStatus(
                          e.target.value as 'not_started' | 'in_progress' | 'blocked' | 'complete'
                        )
                      }
                      className="w-full px-3 py-2 bg-[#1a1a2e] border border-white/10 rounded-lg text-white outline-none focus:border-white/20 transition-colors [&>option]:bg-[#1a1a2e] [&>option]:text-white"
                    >
                      <option value="not_started">Not Started</option>
                      <option value="in_progress">In Progress</option>
                      <option value="blocked">Blocked</option>
                      <option value="complete">Complete</option>
                    </select>
                  </div>
                </div>

                {/* Attachments Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white">Attachments & References</h3>
                  </div>

                  {/* Attachments List */}
                  {attachments.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {attachments.map((attachment, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-lg"
                        >
                          <span className="text-white/80 text-sm">{attachment}</span>
                          <button
                            onClick={() => deleteAttachment(index)}
                            className="text-white/40 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Reference Section */}
                  {showAttachmentInput ? (
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={attachmentInput}
                        onChange={(e) => setAttachmentInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            addAttachment();
                          }
                        }}
                        placeholder="Enter document name..."
                        className="flex-1 px-3 py-2 bg-white/[0.02] border border-white/5 rounded-lg text-white placeholder-white/40 outline-none focus:border-white/20"
                        autoFocus
                      />
                      <button
                        onClick={addAttachment}
                        className="px-3 py-2 bg-[#0066ff] text-white rounded-lg hover:bg-[#0052cc] transition-colors text-sm font-medium"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setShowAttachmentInput(false);
                          setAttachmentInput('');
                        }}
                        className="px-3 py-2 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-colors text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAttachmentInput(true)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                    >
                      <Plus size={16} />
                      Add Reference
                    </button>
                  )}
                </div>

                {/* AI Assist Panel */}
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-lg">
                  <h3 className="text-sm font-semibold text-white mb-3">AI Assist</h3>
                  <button
                    onClick={handleAutoFill}
                    disabled={isLoadingAI}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[#8b5cf6] to-[#0066ff] text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity font-medium text-sm"
                  >
                    {isLoadingAI ? (
                      <>
                        <Loader size={16} className="animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={16} />
                        Auto-Fill All
                      </>
                    )}
                  </button>
                  <p className="text-xs text-white/40 mt-2">
                    Generates subtasks, notes, assignee suggestion, and hour estimate
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-[#0a0a1a] border-t border-white/5 p-6 flex items-center justify-between gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={handleMarkComplete}
                    disabled={status === 'complete'}
                    className="px-4 py-2 text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors font-medium disabled:opacity-50"
                  >
                    Mark Complete
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-[#0066ff] text-white rounded-lg hover:bg-[#0052cc] transition-colors font-medium"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default TaskModal;
