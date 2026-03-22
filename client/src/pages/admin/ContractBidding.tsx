"use client";

import React, { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, RefreshCw, Search, ExternalLink, ChevronDown, ChevronUp, Zap, Target, Clock, Shield, FileText } from "lucide-react";
import { toast } from "sonner";

// ============================================================
// TYPES
// ============================================================

interface Contract {
  id: string;
  title: string;
  client: string;
  value: number;
  type: "assessment" | "modernization" | "security" | "intelligence" | "systems";
  status: "bidding" | "review" | "active" | "completed";
  startDate: string;
  endDate: string;
  description?: string;
}

interface SamOpportunity {
  noticeId: string;
  title: string;
  solicitationNumber: string;
  type: string;
  postedDate: string;
  responseDeadline: string | null;
  naicsCode: string;
  setAside: string;
  setAsideDescription: string;
  organization: string;
  placeOfPerformance: string;
  score: number;
  reasons: string[];
  awardAmount: number | null;
  pointOfContact: any;
  uiLink: string;
  active: string;
}

interface ProposalBrief {
  opportunity: {
    title: string;
    solicitation: string;
    organization: string;
    naics: string;
    set_aside: string;
    posted: string;
    deadline: string;
    days_remaining: number | null;
    score: number;
  };
  proposal_brief: {
    bid_recommendation: string;
    rationale: string;
    capability_alignment: string[];
    pursuit_strategy: string;
    key_personnel_needed: string;
    estimated_level_of_effort: string;
    past_performance_relevance: string;
  };
  next_steps: string[];
}

interface DailyDigest {
  generatedAt: string;
  executive_summary: {
    date: string;
    total_opportunities_tracked: number;
    high_value_opportunities: number;
    sdvosb_opportunities: number;
    urgent_deadlines: number;
    proposal_briefs_generated: number;
    strong_bid_recommendations: number;
    action_items_count: number;
  };
  opportunity_intelligence: any;
  proposal_pipeline: {
    pipeline_summary?: any;
    proposal_briefs?: ProposalBrief[];
  };
  action_items: any[];
  agent_status: any[];
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function ContractBidding() {
  // Tab state
  const [activeTab, setActiveTab] = useState<"pipeline" | "opportunities" | "proposals" | "digest">("pipeline");

  // Pipeline state (existing)
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "bidding" | "review" | "active" | "completed">("all");
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: "", client: "", value: "", type: "assessment" as const,
    status: "bidding" as const, startDate: "", endDate: "", description: "",
  });

  // SAM.gov state
  const [opportunities, setOpportunities] = useState<SamOpportunity[]>([]);
  const [oppsLoading, setOppsLoading] = useState(false);
  const [oppSearch, setOppSearch] = useState("");
  const [oppScoreFilter, setOppScoreFilter] = useState(0);
  const [expandedOpp, setExpandedOpp] = useState<string | null>(null);

  // Digest state
  const [digest, setDigest] = useState<DailyDigest | null>(null);
  const [digestLoading, setDigestLoading] = useState(false);
  const [expandedBrief, setExpandedBrief] = useState<number | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("sisg_admin_token") : null;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  // ============================================================
  // DATA FETCHING
  // ============================================================

  useEffect(() => { fetchContracts(); }, []);

  const fetchContracts = async () => {
    try {
      const response = await fetch("/api/admin/contracts", { headers });
      if (response.ok) {
        const data = await response.json();
        setContracts(data);
      }
    } catch (error) {
      console.error("Failed to fetch contracts:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOpportunities = useCallback(async () => {
    setOppsLoading(true);
    try {
      const response = await fetch("/api/admin/agents/opportunities?limit=50", { headers });
      if (response.ok) {
        const data = await response.json();
        setOpportunities(data.data || []);
      } else {
        toast.error("Failed to load opportunities — run Contracts agent first");
      }
    } catch (error) {
      console.error("Failed to fetch opportunities:", error);
    } finally {
      setOppsLoading(false);
    }
  }, []);

  const fetchDigest = useCallback(async () => {
    setDigestLoading(true);
    try {
      const response = await fetch("/api/admin/agents/digest", { headers });
      if (response.ok) {
        const data = await response.json();
        setDigest(data.data);
        toast.success("Daily digest generated");
      } else {
        toast.error("Failed to generate digest");
      }
    } catch (error) {
      console.error("Failed to fetch digest:", error);
      toast.error("Failed to generate digest");
    } finally {
      setDigestLoading(false);
    }
  }, []);

  const runContractsAgent = async () => {
    toast.info("Running SAM.gov scan...");
    try {
      const response = await fetch("/api/admin/agents/contracts/run", { method: "POST", headers });
      if (response.ok) {
        toast.success("SAM.gov scan complete");
        fetchOpportunities();
      } else {
        toast.error("Agent run failed");
      }
    } catch { toast.error("Agent run failed"); }
  };

  // Load tab data on tab switch
  useEffect(() => {
    if (activeTab === "opportunities" && opportunities.length === 0) fetchOpportunities();
  }, [activeTab]);

  // ============================================================
  // HANDLERS
  // ============================================================

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/admin/contracts", {
        method: "POST", headers,
        body: JSON.stringify({ ...formData, value: parseFloat(formData.value) }),
      });
      if (response.ok) {
        const newContract = await response.json();
        setContracts((prev) => [...prev, newContract]);
        setShowModal(false);
        setFormData({ title: "", client: "", value: "", type: "assessment", status: "bidding", startDate: "", endDate: "", description: "" });
        toast.success("Contract bid created successfully");
      } else {
        toast.error("Failed to create contract bid");
      }
    } catch (error) {
      toast.error("Failed to create contract bid");
    }
  };

  // ============================================================
  // COMPUTED VALUES
  // ============================================================

  const filteredContracts = contracts.filter((c) => statusFilter === "all" || c.status === statusFilter);

  const filteredOpps = opportunities
    .filter((o) => o.score >= oppScoreFilter)
    .filter((o) => !oppSearch || o.title.toLowerCase().includes(oppSearch.toLowerCase())
      || o.solicitationNumber?.toLowerCase().includes(oppSearch.toLowerCase())
      || o.organization?.toLowerCase().includes(oppSearch.toLowerCase()));

  const stats = {
    totalValue: contracts.reduce((sum, c) => sum + c.value, 0),
    activeCount: contracts.filter((c) => c.status === "active").length,
    biddingCount: contracts.filter((c) => c.status === "bidding").length,
    winRate: contracts.length > 0
      ? Math.round((contracts.filter((c) => c.status === "completed").length / contracts.length) * 100)
      : 0,
  };

  // ============================================================
  // HELPERS
  // ============================================================

  const getStatusColor = (status: string) => {
    switch (status) {
      case "bidding": return "#ffb800";
      case "review": return "#8b5cf6";
      case "active": return "#00e5a0";
      case "completed": return "#0066ff";
      default: return "#666";
    }
  };

  const formatValue = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 40) return "#00e5a0";
    if (score >= 25) return "#ffb800";
    if (score >= 15) return "#0066ff";
    return "#666";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 40) return "STRONG";
    if (score >= 25) return "GOOD";
    if (score >= 15) return "MODERATE";
    return "LOW";
  };

  const getBidColor = (rec: string) => {
    if (rec === "STRONG BID") return "#00e5a0";
    if (rec === "RECOMMENDED") return "#ffb800";
    return "#0066ff";
  };

  const daysUntil = (dateStr: string | null) => {
    if (!dateStr) return null;
    const days = Math.round((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : null;
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
                Contract <span className="gradient-text">Operations Center</span>
              </h1>
              <p className="text-gray-400 mt-2">Pipeline management, SAM.gov intelligence, and proposal generation</p>
            </div>
            <div className="flex gap-2">
              {activeTab === "pipeline" && (
                <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-[#0066ff] text-white hover:bg-[#0052cc] transition-colors text-sm">
                  <Plus size={16} /> Add Contract
                </button>
              )}
              {activeTab === "opportunities" && (
                <button onClick={runContractsAgent} className="flex items-center gap-2 px-4 py-2 bg-[#8b5cf6] text-white hover:bg-[#7c3aed] transition-colors text-sm">
                  <RefreshCw size={16} /> Scan SAM.gov
                </button>
              )}
              {activeTab === "digest" && (
                <button onClick={fetchDigest} disabled={digestLoading} className="flex items-center gap-2 px-4 py-2 bg-[#00e5a0] text-black hover:bg-[#00cc8a] transition-colors text-sm disabled:opacity-50">
                  <Zap size={16} /> {digestLoading ? "Generating..." : "Generate Digest"}
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Main Tab Navigation */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex gap-1 overflow-x-auto border-b border-white/10 pb-0">
          {([
            { key: "pipeline", label: "Bidding Pipeline", icon: FileText },
            { key: "opportunities", label: "SAM.gov Intelligence", icon: Search },
            { key: "proposals", label: "Proposal Briefs", icon: Target },
            { key: "digest", label: "Daily Digest", icon: Zap },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)} className={`flex items-center gap-2 px-4 py-3 text-sm font-mono uppercase tracking-wider whitespace-nowrap transition-all border-b-2 ${activeTab === key ? "border-[#0066ff] text-white" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </motion.div>

        {/* ============================================================ */}
        {/* TAB: PIPELINE (EXISTING) */}
        {/* ============================================================ */}
        {activeTab === "pipeline" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="tech-card p-5">
                <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Total Pipeline Value</p>
                <p className="text-2xl font-bold text-white mt-3">{formatValue(stats.totalValue)}</p>
              </div>
              <div className="tech-card p-5">
                <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Active Contracts</p>
                <p className="text-2xl font-bold mt-3" style={{ color: "#00e5a0" }}>{stats.activeCount}</p>
              </div>
              <div className="tech-card p-5">
                <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Bidding</p>
                <p className="text-2xl font-bold mt-3" style={{ color: "#ffb800" }}>{stats.biddingCount}</p>
              </div>
              <div className="tech-card p-5">
                <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Win Rate</p>
                <p className="text-2xl font-bold mt-3" style={{ color: "#0066ff" }}>{stats.winRate}%</p>
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex gap-2 overflow-x-auto">
              {(["all", "bidding", "review", "active", "completed"] as const).map((status) => (
                <button key={status} onClick={() => setStatusFilter(status)} className={`px-4 py-2 text-sm font-mono uppercase tracking-widest whitespace-nowrap transition-colors ${statusFilter === status ? "bg-[#0066ff] text-white" : "bg-white/5 text-gray-400 hover:text-white"}`}>
                  {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>

            {/* Contracts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {loading ? (
                <p className="text-gray-400">Loading contracts...</p>
              ) : filteredContracts.length === 0 ? (
                <p className="text-gray-400">No contracts found</p>
              ) : (
                filteredContracts.map((contract) => (
                  <div key={contract.id} className="tech-card p-5 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-white font-bold text-lg" style={{ fontFamily: "Sora, sans-serif" }}>{contract.title}</h3>
                        <p className="text-gray-400 text-sm mt-1">{contract.client}</p>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-1 border" style={{ borderColor: getStatusColor(contract.status), color: getStatusColor(contract.status) }}>
                        {contract.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex gap-4">
                      <div>
                        <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Value</p>
                        <p className="text-white font-bold mt-1">{formatValue(contract.value)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Type</p>
                        <span className="text-[10px] font-mono px-2 py-1 border border-white/20 text-gray-300 inline-block mt-1">
                          {contract.type.charAt(0).toUpperCase() + contract.type.slice(1)}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      <p>{new Date(contract.startDate).toLocaleDateString()} - {new Date(contract.endDate).toLocaleDateString()}</p>
                    </div>
                    {contract.description && <p className="text-sm text-gray-300 leading-relaxed">{contract.description}</p>}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {/* ============================================================ */}
        {/* TAB: SAM.GOV OPPORTUNITIES */}
        {/* ============================================================ */}
        {activeTab === "opportunities" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* KPI Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="tech-card p-5">
                <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Total Tracked</p>
                <p className="text-2xl font-bold text-white mt-3">{opportunities.length}</p>
              </div>
              <div className="tech-card p-5">
                <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">High Value (30+)</p>
                <p className="text-2xl font-bold mt-3" style={{ color: "#00e5a0" }}>{opportunities.filter(o => o.score >= 30).length}</p>
              </div>
              <div className="tech-card p-5">
                <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">SDVOSB Set-Asides</p>
                <p className="text-2xl font-bold mt-3" style={{ color: "#8b5cf6" }}>{opportunities.filter(o => o.setAside === "SDVOSBC" || o.setAside === "SDVOSBS").length}</p>
              </div>
              <div className="tech-card p-5">
                <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Urgent Deadlines</p>
                <p className="text-2xl font-bold mt-3" style={{ color: "#ff4444" }}>{opportunities.filter(o => { const d = daysUntil(o.responseDeadline); return d !== null && d <= 7; }).length}</p>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="text" placeholder="Search opportunities, solicitations, agencies..." value={oppSearch} onChange={(e) => setOppSearch(e.target.value)} className="w-full bg-white/5 border border-white/10 text-white pl-9 pr-3 py-2 outline-none text-sm placeholder-gray-500" />
              </div>
              <select value={oppScoreFilter} onChange={(e) => setOppScoreFilter(Number(e.target.value))} className="bg-white/5 border border-white/10 text-white px-3 py-2 outline-none text-sm">
                <option value={0}>All Scores</option>
                <option value={15}>Score 15+ (Moderate)</option>
                <option value={25}>Score 25+ (Good)</option>
                <option value={30}>Score 30+ (Strong)</option>
                <option value={40}>Score 40+ (Top Match)</option>
              </select>
            </div>

            {/* Opportunities List */}
            {oppsLoading ? (
              <div className="text-center py-12 text-gray-400">
                <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
                <p>Loading SAM.gov opportunities...</p>
              </div>
            ) : filteredOpps.length === 0 ? (
              <div className="tech-card p-8 text-center">
                <Search size={32} className="mx-auto mb-3 text-gray-500" />
                <p className="text-gray-400 mb-2">No opportunities found</p>
                <p className="text-gray-500 text-sm">Click "Scan SAM.gov" to fetch the latest opportunities</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOpps.map((opp) => {
                  const days = daysUntil(opp.responseDeadline);
                  const isExpanded = expandedOpp === opp.noticeId;
                  return (
                    <div key={opp.noticeId} className="tech-card overflow-hidden">
                      <div className="p-5 cursor-pointer" onClick={() => setExpandedOpp(isExpanded ? null : opp.noticeId)}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-mono px-2 py-0.5 border" style={{ borderColor: getScoreColor(opp.score), color: getScoreColor(opp.score) }}>
                                {getScoreLabel(opp.score)} ({opp.score})
                              </span>
                              {opp.setAside && opp.setAside !== "" && (
                                <span className="text-[10px] font-mono px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                  {opp.setAsideDescription || opp.setAside}
                                </span>
                              )}
                              {days !== null && days <= 7 && (
                                <span className="text-[10px] font-mono px-2 py-0.5 bg-red-500/20 text-red-300 border border-red-500/30">
                                  {days}d LEFT
                                </span>
                              )}
                            </div>
                            <h3 className="text-white font-bold text-sm leading-tight truncate">{opp.title}</h3>
                            <p className="text-gray-500 text-xs mt-1 truncate">{opp.organization}</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <p className="text-[10px] font-mono text-gray-600">NAICS {opp.naicsCode}</p>
                              <p className="text-[10px] font-mono text-gray-500">{opp.type}</p>
                            </div>
                            {isExpanded ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                          </div>
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-white/5">
                            <div className="p-5 space-y-4">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                                <div>
                                  <p className="text-gray-600 font-mono uppercase text-[10px] mb-1">Solicitation</p>
                                  <p className="text-gray-300">{opp.solicitationNumber || "N/A"}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600 font-mono uppercase text-[10px] mb-1">Posted</p>
                                  <p className="text-gray-300">{opp.postedDate || "N/A"}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600 font-mono uppercase text-[10px] mb-1">Deadline</p>
                                  <p className={`${days !== null && days <= 7 ? "text-red-400 font-bold" : "text-gray-300"}`}>
                                    {opp.responseDeadline ? `${opp.responseDeadline}${days !== null ? ` (${days}d)` : ""}` : "Open"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-600 font-mono uppercase text-[10px] mb-1">Location</p>
                                  <p className="text-gray-300">{opp.placeOfPerformance || "N/A"}</p>
                                </div>
                              </div>

                              {opp.reasons && opp.reasons.length > 0 && (
                                <div>
                                  <p className="text-gray-600 font-mono uppercase text-[10px] mb-2">Match Reasons</p>
                                  <div className="flex flex-wrap gap-1">
                                    {opp.reasons.map((r: string, i: number) => (
                                      <span key={i} className="text-[10px] font-mono px-2 py-0.5 bg-blue-500/10 text-blue-300 border border-blue-500/20">{r}</span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {opp.pointOfContact && (
                                <div>
                                  <p className="text-gray-600 font-mono uppercase text-[10px] mb-1">Point of Contact</p>
                                  <p className="text-gray-300 text-xs">{opp.pointOfContact.fullName} — {opp.pointOfContact.email} {opp.pointOfContact.phone ? `| ${opp.pointOfContact.phone}` : ""}</p>
                                </div>
                              )}

                              {opp.awardAmount && (
                                <div>
                                  <p className="text-gray-600 font-mono uppercase text-[10px] mb-1">Award Amount</p>
                                  <p className="text-green-400 font-bold text-sm">${Number(opp.awardAmount).toLocaleString()}</p>
                                </div>
                              )}

                              {opp.uiLink && opp.uiLink !== "null" && (
                                <a href={opp.uiLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[#0066ff] text-xs hover:underline">
                                  <ExternalLink size={12} /> View on SAM.gov
                                </a>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ============================================================ */}
        {/* TAB: PROPOSAL BRIEFS */}
        {/* ============================================================ */}
        {activeTab === "proposals" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {digest?.proposal_pipeline?.proposal_briefs ? (
              <>
                {/* Pipeline Summary */}
                {digest.proposal_pipeline.pipeline_summary && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    <div className="tech-card p-5">
                      <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">In Database</p>
                      <p className="text-2xl font-bold text-white mt-3">{digest.proposal_pipeline.pipeline_summary.total_in_database}</p>
                    </div>
                    <div className="tech-card p-5">
                      <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Actionable</p>
                      <p className="text-2xl font-bold mt-3" style={{ color: "#0066ff" }}>{digest.proposal_pipeline.pipeline_summary.actionable_opportunities}</p>
                    </div>
                    <div className="tech-card p-5">
                      <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Briefs Generated</p>
                      <p className="text-2xl font-bold mt-3" style={{ color: "#8b5cf6" }}>{digest.proposal_pipeline.pipeline_summary.briefs_generated}</p>
                    </div>
                    <div className="tech-card p-5">
                      <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Strong Bids</p>
                      <p className="text-2xl font-bold mt-3" style={{ color: "#00e5a0" }}>{digest.proposal_pipeline.pipeline_summary.strong_bids}</p>
                    </div>
                    <div className="tech-card p-5">
                      <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Recommended</p>
                      <p className="text-2xl font-bold mt-3" style={{ color: "#ffb800" }}>{digest.proposal_pipeline.pipeline_summary.recommended_bids}</p>
                    </div>
                  </div>
                )}

                {/* Proposal Briefs */}
                <div className="space-y-3">
                  {digest.proposal_pipeline.proposal_briefs.map((brief: ProposalBrief, idx: number) => {
                    const isExpanded = expandedBrief === idx;
                    return (
                      <div key={idx} className="tech-card overflow-hidden">
                        <div className="p-5 cursor-pointer" onClick={() => setExpandedBrief(isExpanded ? null : idx)}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-mono px-2 py-0.5 border font-bold" style={{ borderColor: getBidColor(brief.proposal_brief.bid_recommendation), color: getBidColor(brief.proposal_brief.bid_recommendation) }}>
                                  {brief.proposal_brief.bid_recommendation}
                                </span>
                                <span className="text-[10px] font-mono text-gray-500">Score: {brief.opportunity.score}</span>
                                {brief.opportunity.days_remaining !== null && brief.opportunity.days_remaining <= 14 && (
                                  <span className="text-[10px] font-mono px-2 py-0.5 bg-red-500/20 text-red-300 border border-red-500/30">
                                    <Clock size={10} className="inline mr-1" />{brief.opportunity.days_remaining}d
                                  </span>
                                )}
                              </div>
                              <h3 className="text-white font-bold text-sm leading-tight">{brief.opportunity.title}</h3>
                              <p className="text-gray-500 text-xs mt-1">{brief.opportunity.organization}</p>
                            </div>
                            <div className="shrink-0">
                              {isExpanded ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                            </div>
                          </div>
                        </div>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-white/5">
                              <div className="p-5 space-y-5">
                                {/* Opportunity Details */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                                  <div>
                                    <p className="text-gray-600 font-mono uppercase text-[10px] mb-1">Solicitation</p>
                                    <p className="text-gray-300">{brief.opportunity.solicitation}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-600 font-mono uppercase text-[10px] mb-1">NAICS</p>
                                    <p className="text-gray-300">{brief.opportunity.naics}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-600 font-mono uppercase text-[10px] mb-1">Set-Aside</p>
                                    <p className="text-purple-300">{brief.opportunity.set_aside}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-600 font-mono uppercase text-[10px] mb-1">Deadline</p>
                                    <p className={brief.opportunity.days_remaining && brief.opportunity.days_remaining <= 7 ? "text-red-400 font-bold" : "text-gray-300"}>
                                      {brief.opportunity.deadline}{brief.opportunity.days_remaining !== null ? ` (${brief.opportunity.days_remaining}d)` : ""}
                                    </p>
                                  </div>
                                </div>

                                {/* Proposal Brief */}
                                <div className="bg-white/3 border border-white/5 p-4 space-y-3">
                                  <h4 className="text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2"><Target size={12} /> Proposal Brief</h4>
                                  <div>
                                    <p className="text-gray-500 text-[10px] font-mono uppercase mb-1">Rationale</p>
                                    <p className="text-gray-300 text-sm">{brief.proposal_brief.rationale}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500 text-[10px] font-mono uppercase mb-1">Pursuit Strategy</p>
                                    <p className="text-gray-300 text-sm">{brief.proposal_brief.pursuit_strategy}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500 text-[10px] font-mono uppercase mb-1">Capability Alignment</p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {brief.proposal_brief.capability_alignment.map((cap: string, i: number) => (
                                        <span key={i} className="text-[10px] font-mono px-2 py-0.5 bg-green-500/10 text-green-300 border border-green-500/20">
                                          <Shield size={8} className="inline mr-1" />{cap}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <p className="text-gray-500 text-[10px] font-mono uppercase mb-1">Key Personnel</p>
                                      <p className="text-gray-300 text-xs">{brief.proposal_brief.key_personnel_needed}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500 text-[10px] font-mono uppercase mb-1">Level of Effort</p>
                                      <p className="text-gray-300 text-xs">{brief.proposal_brief.estimated_level_of_effort}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Next Steps */}
                                <div>
                                  <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-2">Next Steps</h4>
                                  <div className="space-y-1">
                                    {brief.next_steps.map((step: string, i: number) => (
                                      <div key={i} className="flex items-start gap-2 text-xs">
                                        <span className="text-[#0066ff] font-mono shrink-0">{i + 1}.</span>
                                        <span className="text-gray-300">{step}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="tech-card p-8 text-center">
                <Target size={32} className="mx-auto mb-3 text-gray-500" />
                <p className="text-gray-400 mb-2">No proposal briefs generated yet</p>
                <p className="text-gray-500 text-sm mb-4">Generate a Daily Digest first to populate proposal briefs</p>
                <button onClick={() => { setActiveTab("digest"); fetchDigest(); }} className="px-4 py-2 bg-[#0066ff] text-white text-sm hover:bg-[#0052cc] transition-colors">
                  Generate Daily Digest
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* ============================================================ */}
        {/* TAB: DAILY DIGEST */}
        {/* ============================================================ */}
        {activeTab === "digest" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {digestLoading ? (
              <div className="text-center py-16 text-gray-400">
                <RefreshCw size={32} className="animate-spin mx-auto mb-4" />
                <p className="text-lg">Generating daily intelligence digest...</p>
                <p className="text-sm text-gray-500 mt-2">Scanning SAM.gov, analyzing opportunities, generating proposal briefs</p>
              </div>
            ) : digest ? (
              <>
                {/* Executive Summary Header */}
                <div className="tech-card p-6 border-l-4" style={{ borderLeftColor: "#00e5a0" }}>
                  <h2 className="text-lg font-bold text-white mb-1" style={{ fontFamily: "Sora, sans-serif" }}>
                    SISG Daily Opportunity Digest
                  </h2>
                  <p className="text-gray-400 text-sm">{digest.executive_summary.date} — Generated {new Date(digest.generatedAt).toLocaleTimeString()}</p>
                </div>

                {/* Executive KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                  {[
                    { label: "Tracked", value: digest.executive_summary.total_opportunities_tracked, color: "#fff" },
                    { label: "High Value", value: digest.executive_summary.high_value_opportunities, color: "#00e5a0" },
                    { label: "SDVOSB", value: digest.executive_summary.sdvosb_opportunities, color: "#8b5cf6" },
                    { label: "Urgent", value: digest.executive_summary.urgent_deadlines, color: "#ff4444" },
                    { label: "Briefs", value: digest.executive_summary.proposal_briefs_generated, color: "#0066ff" },
                    { label: "Strong Bids", value: digest.executive_summary.strong_bid_recommendations, color: "#00e5a0" },
                    { label: "Actions", value: digest.executive_summary.action_items_count, color: "#ffb800" },
                  ].map((kpi, i) => (
                    <div key={i} className="tech-card p-4">
                      <p className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">{kpi.label}</p>
                      <p className="text-xl font-bold mt-2" style={{ color: kpi.color }}>{kpi.value}</p>
                    </div>
                  ))}
                </div>

                {/* Action Items */}
                {digest.action_items.length > 0 && (
                  <div className="tech-card p-5">
                    <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Zap size={14} style={{ color: "#ffb800" }} /> Action Items ({digest.action_items.length})
                    </h3>
                    <div className="space-y-2">
                      {digest.action_items.map((item: any, i: number) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-white/3 border border-white/5">
                          <span className={`text-[10px] font-mono px-2 py-0.5 border shrink-0 ${item.priority === "URGENT" ? "border-red-500 text-red-400" : item.priority === "HIGH" ? "border-orange-500 text-orange-400" : "border-blue-500 text-blue-400"}`}>
                            {item.priority}
                          </span>
                          <div className="min-w-0">
                            <p className="text-gray-200 text-sm">{item.action}</p>
                            {item.deadline && <p className="text-gray-500 text-xs mt-1">Deadline: {item.deadline}</p>}
                            {item.contact && <p className="text-gray-500 text-xs">Contact: {item.contact}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Opportunity Intelligence Summary */}
                {digest.opportunity_intelligence?.scan_summary && (
                  <div className="tech-card p-5">
                    <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Search size={14} style={{ color: "#0066ff" }} /> SAM.gov Intelligence Summary
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      <div>
                        <p className="text-gray-600 font-mono uppercase text-[10px] mb-1">Scan Period</p>
                        <p className="text-gray-300">{digest.opportunity_intelligence.scan_summary.period}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 font-mono uppercase text-[10px] mb-1">NAICS Codes</p>
                        <p className="text-gray-300">{digest.opportunity_intelligence.scan_summary.naics_codes?.join(", ")}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 font-mono uppercase text-[10px] mb-1">Unique Opportunities</p>
                        <p className="text-gray-300">{digest.opportunity_intelligence.scan_summary.total_unique_opportunities}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 font-mono uppercase text-[10px] mb-1">Set-Asides Monitored</p>
                        <p className="text-gray-300">{digest.opportunity_intelligence.scan_summary.set_asides_monitored?.join(", ")}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Agent Status */}
                {digest.agent_status && (
                  <div className="tech-card p-5">
                    <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Agent Status</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {digest.agent_status.map((agent: any, i: number) => (
                        <div key={i} className="bg-white/3 border border-white/5 p-3">
                          <p className="text-gray-400 text-[10px] font-mono uppercase">{agent.name}</p>
                          <p className={`text-xs font-bold mt-1 ${agent.status === "deployed" ? "text-green-400" : agent.status === "error" ? "text-red-400" : "text-gray-500"}`}>
                            {agent.status}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="tech-card p-8 text-center">
                <Zap size={32} className="mx-auto mb-3 text-gray-500" />
                <p className="text-gray-400 mb-2">No digest generated yet</p>
                <p className="text-gray-500 text-sm mb-4">Click "Generate Digest" to run a comprehensive SAM.gov scan, score opportunities, and generate proposal briefs</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Add Contract Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="tech-card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>Add New Contract</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest block mb-2">Title</label>
                    <input type="text" value={formData.title} onChange={(e) => handleInputChange("title", e.target.value)} className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 outline-none" required />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest block mb-2">Client</label>
                    <input type="text" value={formData.client} onChange={(e) => handleInputChange("client", e.target.value)} className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 outline-none" required />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest block mb-2">Contract Value ($)</label>
                    <input type="number" value={formData.value} onChange={(e) => handleInputChange("value", e.target.value)} className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 outline-none" required />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest block mb-2">Type</label>
                    <select value={formData.type} onChange={(e) => handleInputChange("type", e.target.value)} className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 outline-none">
                      <option value="assessment">Assessment</option>
                      <option value="modernization">Modernization</option>
                      <option value="security">Security</option>
                      <option value="intelligence">Intelligence</option>
                      <option value="systems">Systems</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest block mb-2">Status</label>
                    <select value={formData.status} onChange={(e) => handleInputChange("status", e.target.value)} className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 outline-none">
                      <option value="bidding">Bidding</option>
                      <option value="review">Review</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest block mb-2">Start Date</label>
                    <input type="date" value={formData.startDate} onChange={(e) => handleInputChange("startDate", e.target.value)} className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 outline-none" required />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest block mb-2">End Date</label>
                    <input type="date" value={formData.endDate} onChange={(e) => handleInputChange("endDate", e.target.value)} className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 outline-none" required />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest block mb-2">Description</label>
                  <textarea value={formData.description} onChange={(e) => handleInputChange("description", e.target.value)} className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 outline-none" rows={4} />
                </div>
                <div className="flex gap-3 justify-end">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-white/5 text-gray-300 hover:text-white transition-colors">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-[#0066ff] text-white hover:bg-[#0052cc] transition-colors">Create Contract</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
