import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Calendar,
  Clock,
  Zap,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Loader,
} from "lucide-react";
import { toast } from "sonner";

export interface MilestoneModalData {
  milestoneKey: string;
  name: string;
  status: "pending" | "in_progress" | "complete";
  startDate: string;
  targetDate: string;
  dependencies: {
    id: string;
    name: string;
    status: "met" | "unmet" | "in_progress";
  }[];
  deliverables: {
    id: string;
    title: string;
    type: string;
    completed: boolean;
  }[];
  completionCriteria: {
    id: string;
    text: string;
    met: boolean;
  }[];
  notes: string;
}

interface MilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: MilestoneModalData) => void;
  milestoneName: string;
  milestoneKey: string;
  milestoneDate: string;
  milestoneIndex: number;
  opportunity: any;
  proposalDeadline: string | null;
  initialData?: MilestoneModalData | null;
}

const MilestoneModal: React.FC<MilestoneModalProps> = ({
  isOpen,
  onClose,
  onSave,
  milestoneName,
  milestoneKey,
  milestoneDate,
  milestoneIndex,
  opportunity,
  proposalDeadline,
  initialData,
}) => {
  const [name, setName] = useState(milestoneName);
  const [status, setStatus] = useState<"pending" | "in_progress" | "complete">(
    initialData?.status || "pending"
  );
  const [startDate, setStartDate] = useState(initialData?.startDate || "");
  const [targetDate, setTargetDate] = useState(
    initialData?.targetDate || milestoneDate
  );
  const [dependencies, setDependencies] = useState(
    initialData?.dependencies || []
  );
  const [deliverables, setDeliverables] = useState(
    initialData?.deliverables || []
  );
  const [completionCriteria, setCompletionCriteria] = useState(
    initialData?.completionCriteria || []
  );
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [newDependency, setNewDependency] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const generateUUID = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const daysUntilDue = useCallback(() => {
    if (!targetDate) return null;
    const target = new Date(targetDate);
    const today = new Date();
    const diff = Math.ceil(
      (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diff;
  }, [targetDate]);

  const timelineProgress = useCallback(() => {
    if (!startDate || !targetDate || !proposalDeadline) return 0;
    const start = new Date(startDate).getTime();
    const target = new Date(targetDate).getTime();
    const deadline = new Date(proposalDeadline).getTime();
    if (deadline <= start) return 0;
    return Math.min(100, ((target - start) / (deadline - start)) * 100);
  }, [startDate, targetDate, proposalDeadline]);

  const deliverableProgress = useCallback(() => {
    if (deliverables.length === 0) return 0;
    const completed = deliverables.filter((d) => d.completed).length;
    return (completed / deliverables.length) * 100;
  }, [deliverables]);

  const handleAddDependency = () => {
    if (!newDependency.trim()) {
      toast.error("Please enter a dependency name");
      return;
    }
    const newDep = {
      id: generateUUID(),
      name: newDependency,
      status: "unmet" as const,
    };
    setDependencies([...dependencies, newDep]);
    setNewDependency("");
    toast.success("Dependency added");
  };

  const handleRemoveDependency = (id: string) => {
    setDependencies(dependencies.filter((d) => d.id !== id));
  };

  const handleAddDeliverable = () => {
    const newDeliverable = {
      id: generateUUID(),
      title: "New Deliverable",
      type: "Document",
      completed: false,
    };
    setDeliverables([...deliverables, newDeliverable]);
  };

  const handleUpdateDeliverable = (
    id: string,
    field: string,
    value: any
  ) => {
    setDeliverables(
      deliverables.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    );
  };

  const handleRemoveDeliverable = (id: string) => {
    setDeliverables(deliverables.filter((d) => d.id !== id));
  };

  const handleAddCriterion = () => {
    const newCriterion = {
      id: generateUUID(),
      text: "New criterion",
      met: false,
    };
    setCompletionCriteria([...completionCriteria, newCriterion]);
  };

  const handleUpdateCriterion = (
    id: string,
    field: string,
    value: any
  ) => {
    setCompletionCriteria(
      completionCriteria.map((c) =>
        c.id === id ? { ...c, [field]: value } : c
      )
    );
  };

  const handleRemoveCriterion = (id: string) => {
    setCompletionCriteria(completionCriteria.filter((c) => c.id !== id));
  };

  const handleAutoFill = async () => {
    setAiLoading(true);
    try {
      const token = localStorage.getItem("sisg_admin_token");
      const response = await fetch("/api/admin/agents/modal/ai-assist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: "milestone",
          milestoneName: name,
          milestoneDate: targetDate,
          opportunityTitle: opportunity?.title || "",
          naicsCode: opportunity?.naicsCode || "",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate AI suggestions");
      }

      const data = await response.json();

      if (data.dependencies) {
        setDependencies(
          data.dependencies.map((dep: any) => ({
            id: generateUUID(),
            name: dep.name || dep,
            status: dep.status || "unmet",
          }))
        );
      }

      if (data.deliverables) {
        setDeliverables(
          data.deliverables.map((del: any) => ({
            id: generateUUID(),
            title: del.title || del,
            type: del.type || "Document",
            completed: false,
          }))
        );
      }

      if (data.completionCriteria) {
        setCompletionCriteria(
          data.completionCriteria.map((crit: any) => ({
            id: generateUUID(),
            text: crit.text || crit,
            met: false,
          }))
        );
      }

      if (data.notes) {
        setNotes(data.notes);
      }

      toast.success("AI-generated suggestions applied!");
    } catch (error) {
      console.error("AI assist error:", error);
      toast.error("Failed to generate AI suggestions");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = () => {
    setLoading(true);
    try {
      onSave({
        milestoneKey,
        name,
        status,
        startDate,
        targetDate,
        dependencies,
        deliverables,
        completionCriteria,
        notes,
      });
      toast.success("Milestone saved successfully");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save milestone");
    } finally {
      setLoading(false);
    }
  };

  const cycleStatus = () => {
    const statusCycle: Record<
      "pending" | "in_progress" | "complete",
      "pending" | "in_progress" | "complete"
    > = {
      pending: "in_progress",
      in_progress: "complete",
      complete: "pending",
    };
    setStatus(statusCycle[status]);
  };

  const getStatusColor = (
    s: "pending" | "in_progress" | "complete"
  ) => {
    switch (s) {
      case "pending":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
      case "in_progress":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "complete":
        return "bg-green-500/20 text-green-300 border-green-500/30";
    }
  };

  const getStatusLabel = (
    s: "pending" | "in_progress" | "complete"
  ): string => {
    return s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ");
  };

  const getDependencyStatusColor = (s: "met" | "unmet" | "in_progress") => {
    switch (s) {
      case "met":
        return "text-green-400";
      case "unmet":
        return "text-red-400";
      case "in_progress":
        return "text-yellow-400";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0a0a1a] border border-white/5 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-[#0a0a1a] border-b border-white/5 p-6 flex items-center justify-between">
              <div className="flex-1">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-2xl font-bold text-white bg-transparent border-0 p-0 focus:outline-none w-full"
                />
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Status and Date Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-white/60 mb-2 block">
                    Status
                  </label>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                      status
                    )} cursor-pointer hover:opacity-80 transition-opacity`}
                    onClick={cycleStatus}
                  >
                    {getStatusLabel(status)}
                  </span>
                </div>
                <div>
                  <label className="text-sm text-white/60 mb-2 block">
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#0066ff]"
                  />
                </div>
              </div>

              {/* Timeline Section */}
              <div className="bg-white/[0.02] border border-white/5 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#0066ff]" />
                  Timeline
                </h3>

                <div className="space-y-4">
                  {/* Timeline bar */}
                  <div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#0066ff] to-[#8b5cf6] transition-all duration-300"
                        style={{ width: `${timelineProgress()}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-white/50 mt-2">
                      <span>Proposal Start</span>
                      <span>Deadline</span>
                    </div>
                  </div>

                  {/* Start and Target Date */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-white/60 mb-1 block">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#0066ff]"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-white/60 mb-1 block">
                        Days Until Due
                      </label>
                      <div className="px-3 py-2 bg-[#1a1a2e] border border-white/10 rounded-lg text-white text-sm font-semibold">
                        {daysUntilDue() !== null
                          ? `${daysUntilDue()} days`
                          : "N/A"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dependencies Section */}
              <div className="bg-white/[0.02] border border-white/5 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-[#00e5a0]" />
                  Dependencies
                </h3>

                {dependencies.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {dependencies.map((dep) => (
                      <div
                        key={dep.id}
                        className="flex items-center justify-between bg-[#1a1a2e] border border-white/10 rounded-lg p-3"
                      >
                        <div className="flex-1">
                          <p className="text-white text-sm">{dep.name}</p>
                          <p
                            className={`text-xs mt-1 ${getDependencyStatusColor(
                              dep.status
                            )}`}
                          >
                            {dep.status.charAt(0).toUpperCase() +
                              dep.status.slice(1)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveDependency(dep.id)}
                          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newDependency}
                    onChange={(e) => setNewDependency(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") handleAddDependency();
                    }}
                    placeholder="Add dependency..."
                    className="flex-1 bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#0066ff] placeholder-white/40"
                  />
                  <button
                    onClick={handleAddDependency}
                    className="bg-[#00e5a0]/20 hover:bg-[#00e5a0]/30 text-[#00e5a0] border border-[#00e5a0]/30 rounded-lg px-3 py-2 text-sm font-semibold transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Deliverables Section */}
              <div className="bg-white/[0.02] border border-white/5 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#ffb800]" />
                    Deliverables
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#ffb800] transition-all duration-300"
                        style={{ width: `${deliverableProgress()}%` }}
                      />
                    </div>
                    <span className="text-xs text-white/60">
                      {Math.round(deliverableProgress())}%
                    </span>
                  </div>
                </div>

                {deliverables.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {deliverables.map((del) => (
                      <div
                        key={del.id}
                        className="flex items-center gap-3 bg-[#1a1a2e] border border-white/10 rounded-lg p-3"
                      >
                        <input
                          type="checkbox"
                          checked={del.completed}
                          onChange={(e) =>
                            handleUpdateDeliverable(
                              del.id,
                              "completed",
                              e.target.checked
                            )
                          }
                          className="w-4 h-4 rounded accent-[#00e5a0]"
                        />
                        <input
                          type="text"
                          value={del.title}
                          onChange={(e) =>
                            handleUpdateDeliverable(
                              del.id,
                              "title",
                              e.target.value
                            )
                          }
                          className="flex-1 bg-transparent border-0 text-white text-sm focus:outline-none"
                        />
                        <select
                          value={del.type}
                          onChange={(e) =>
                            handleUpdateDeliverable(
                              del.id,
                              "type",
                              e.target.value
                            )
                          }
                          className="bg-[#1a1a2e] text-white text-xs px-2 py-1 rounded border border-white/10 focus:outline-none focus:border-[#0066ff] [&>option]:bg-[#1a1a2e] [&>option]:text-white"
                        >
                          <option>Document</option>
                          <option>Presentation</option>
                          <option>Review</option>
                          <option>Approval</option>
                          <option>Submission</option>
                        </select>
                        <button
                          onClick={() => handleRemoveDeliverable(del.id)}
                          className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={handleAddDeliverable}
                  className="w-full bg-[#ffb800]/20 hover:bg-[#ffb800]/30 text-[#ffb800] border border-[#ffb800]/30 rounded-lg px-3 py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Deliverable
                </button>
              </div>

              {/* Completion Criteria Section */}
              <div className="bg-white/[0.02] border border-white/5 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#8b5cf6]" />
                  Completion Criteria
                </h3>

                {completionCriteria.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {completionCriteria.map((criterion) => (
                      <div
                        key={criterion.id}
                        className="flex items-center gap-3 bg-[#1a1a2e] border border-white/10 rounded-lg p-3"
                      >
                        <input
                          type="checkbox"
                          checked={criterion.met}
                          onChange={(e) =>
                            handleUpdateCriterion(
                              criterion.id,
                              "met",
                              e.target.checked
                            )
                          }
                          className="w-4 h-4 rounded accent-[#8b5cf6]"
                        />
                        <input
                          type="text"
                          value={criterion.text}
                          onChange={(e) =>
                            handleUpdateCriterion(
                              criterion.id,
                              "text",
                              e.target.value
                            )
                          }
                          className="flex-1 bg-transparent border-0 text-white text-sm focus:outline-none"
                        />
                        <button
                          onClick={() => handleRemoveCriterion(criterion.id)}
                          className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={handleAddCriterion}
                  className="w-full bg-[#8b5cf6]/20 hover:bg-[#8b5cf6]/30 text-[#8b5cf6] border border-[#8b5cf6]/30 rounded-lg px-3 py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Criterion
                </button>
              </div>

              {/* Notes Section */}
              <div className="bg-white/[0.02] border border-white/5 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-white mb-4">Notes</h3>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add milestone notes..."
                  rows={4}
                  className="w-full bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#0066ff] placeholder-white/40 resize-none"
                />
              </div>

              {/* AI Assist Panel */}
              <div className="bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 rounded-lg p-4">
                <button
                  onClick={handleAutoFill}
                  disabled={aiLoading}
                  className="w-full bg-[#8b5cf6]/30 hover:bg-[#8b5cf6]/40 disabled:opacity-50 disabled:cursor-not-allowed text-[#8b5cf6] border border-[#8b5cf6]/50 rounded-lg px-4 py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {aiLoading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Auto-Fill All
                    </>
                  )}
                </button>
                <p className="text-xs text-white/50 mt-2">
                  AI will auto-generate dependencies, deliverables, criteria,
                  and notes based on the milestone details.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-[#0a0a1a] border-t border-white/5 p-6 flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={cycleStatus}
                className={`px-4 py-2 rounded-lg transition-colors font-semibold text-sm border ${getStatusColor(
                  status
                )}`}
              >
                {getStatusLabel(status)}
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-6 py-2 bg-gradient-to-r from-[#0066ff] to-[#8b5cf6] hover:from-[#0066ff]/80 hover:to-[#8b5cf6]/80 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold text-sm transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MilestoneModal;
