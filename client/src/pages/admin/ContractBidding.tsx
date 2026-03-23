"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, RefreshCw, Search, ExternalLink, ChevronDown, ChevronUp, Zap, Target, Clock, Shield, FileText, TrendingUp, Bell, CheckCircle2, AlertTriangle, ArrowRight, MapPin, Building2, User, Phone, Mail, Clipboard, BookOpen, Award, Briefcase, ListChecks } from "lucide-react";
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
  // SAM.gov reference fields
  samOpportunityId?: string;
  solicitationNumber?: string;
  naicsCode?: string;
  setAside?: string;
  setAsideDescription?: string;
  department?: string;
  agency?: string;
  placeOfPerformance?: string;
  contractingOfficer?: string;
  contractingOfficerEmail?: string;
  samLink?: string;
  bidRecommendation?: string;
  pursuitStrategy?: string;
  capabilityAlignment?: string[];
  keyPersonnel?: string;
  score?: number;
}

interface SamOpportunity {
  noticeId: string;
  title: string;
  solicitationNumber: string;
  type: string;
  postedDate: string;
  responseDeadline: string | null;
  archiveDate: string | null;
  naicsCode: string;
  classificationCode: string;
  setAside: string;
  setAsideDescription: string;
  organization: string;
  department: string;
  subTier: string;
  office: string;
  placeOfPerformance: string;
  placeOfPerformanceCity: string;
  placeOfPerformanceCountry: string;
  awardAmount: number | null;
  awardDate: string | null;
  awardNumber: string | null;
  awardee: string | null;
  score: number;
  reasons: string[];
  description: string;
  additionalInfo: string | null;
  pointOfContact: any;
  additionalContacts: any[];
  uiLink: string;
  active: string;
  organizationType: string;
  resourceLinks: any[];
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
// ANIMATION VARIANTS
// ============================================================

const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } },
};

const fadeSlide = {
  initial: { opacity: 0, x: 12 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, x: -12, transition: { duration: 0.2 } },
};

const pulseGlow = {
  animate: { boxShadow: ["0 0 0 0 rgba(0,102,255,0)", "0 0 0 6px rgba(0,102,255,0.15)", "0 0 0 0 rgba(0,102,255,0)"] },
  transition: { duration: 2, repeat: Infinity },
};

// ============================================================
// SKELETON LOADER COMPONENTS
// ============================================================

function SkeletonCard() {
  return (
    <div className="tech-card p-5 space-y-4 animate-pulse">
      <div className="flex justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-white/8 rounded w-3/4" />
          <div className="h-3 bg-white/5 rounded w-1/2" />
        </div>
        <div className="h-5 w-16 bg-white/8 rounded" />
      </div>
      <div className="flex gap-4">
        <div className="h-8 w-20 bg-white/5 rounded" />
        <div className="h-8 w-20 bg-white/5 rounded" />
      </div>
    </div>
  );
}

function SkeletonKPI() {
  return (
    <div className="tech-card p-5 animate-pulse">
      <div className="h-3 w-20 bg-white/8 rounded mb-4" />
      <div className="h-8 w-16 bg-white/5 rounded" />
    </div>
  );
}

function SkeletonOpportunity() {
  return (
    <div className="tech-card p-5 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <div className="h-4 w-16 bg-white/8 rounded" />
            <div className="h-4 w-24 bg-white/5 rounded" />
          </div>
          <div className="h-4 bg-white/8 rounded w-4/5" />
          <div className="h-3 bg-white/5 rounded w-2/3" />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ANIMATED COUNTER COMPONENT
// ============================================================

function AnimatedCounter({ value, color = "#fff" }: { value: number; color?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    const start = ref.current;
    const diff = value - start;
    if (diff === 0) return;
    const steps = Math.min(Math.abs(diff), 20);
    const stepTime = 400 / steps;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      const progress = i / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (i >= steps) {
        clearInterval(interval);
        ref.current = value;
      }
    }, stepTime);
    return () => clearInterval(interval);
  }, [value]);
  return <span style={{ color }}>{display}</span>;
}

// ============================================================
// TIME GREETING
// ============================================================

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getQuickInsight(opportunities: SamOpportunity[], contracts: Contract[]): string {
  const urgent = opportunities.filter(o => {
    if (!o.responseDeadline) return false;
    const d = (new Date(o.responseDeadline).getTime() - Date.now()) / 86400000;
    return d > 0 && d <= 7;
  }).length;
  const highValue = opportunities.filter(o => o.score >= 30).length;
  const bidding = contracts.filter(c => c.status === "bidding").length;
  if (urgent > 0) return `You have ${urgent} opportunity deadline${urgent > 1 ? "s" : ""} this week requiring attention.`;
  if (highValue > 0) return `${highValue} high-value SAM.gov match${highValue > 1 ? "es" : ""} identified — review recommended.`;
  if (bidding > 0) return `${bidding} contract${bidding > 1 ? "s" : ""} in the bidding pipeline. Run a SAM.gov scan for new opportunities.`;
  return "Your contract operations center is up to date. Scan SAM.gov to discover new opportunities.";
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function ContractBidding() {
  const [activeTab, setActiveTab] = useState<"pipeline" | "opportunities" | "proposals" | "digest">("pipeline");
  const [prevTab, setPrevTab] = useState<string>("pipeline");

  // Pipeline state
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "bidding" | "review" | "active" | "completed">("all");
  const [showModal, setShowModal] = useState(false);
  const [selectedOppForBid, setSelectedOppForBid] = useState<SamOpportunity | null>(null);
  const [formData, setFormData] = useState({
    title: "", client: "", value: "", type: "assessment" as const,
    status: "bidding" as const, startDate: "", endDate: "", description: "",
    samOpportunityId: "", solicitationNumber: "", naicsCode: "", setAside: "",
    setAsideDescription: "", department: "", agency: "", placeOfPerformance: "",
    contractingOfficer: "", contractingOfficerEmail: "", samLink: "",
    bidRecommendation: "", pursuitStrategy: "", capabilityAlignment: [] as string[],
    keyPersonnel: "", score: 0,
  });

  // SAM.gov state
  const [opportunities, setOpportunities] = useState<SamOpportunity[]>([]);
  const [oppsLoading, setOppsLoading] = useState(false);
  const [oppSearch, setOppSearch] = useState("");
  const [oppScoreFilter, setOppScoreFilter] = useState(0);
  const [expandedOpp, setExpandedOpp] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState<string | null>(null);

  // Digest state
  const [digest, setDigest] = useState<DailyDigest | null>(null);
  const [digestLoading, setDigestLoading] = useState(false);
  const [digestProgress, setDigestProgress] = useState(0);
  const [expandedBrief, setExpandedBrief] = useState<number | null>(null);

  // Welcome state
  const [showWelcome, setShowWelcome] = useState(true);

  // Bidding Process Steps state
  const [biddingStepsOpp, setBiddingStepsOpp] = useState<string | null>(null);

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
        const opps = data.data || [];
        setOpportunities(opps);
        if (opps.length > 0) {
          const high = opps.filter((o: SamOpportunity) => o.score >= 30).length;
          toast.success(`Loaded ${opps.length} opportunities`, { description: `${high} high-value matches identified` });
        }
      } else {
        toast("No opportunities cached yet", { description: "Click 'Scan SAM.gov' to fetch live data", icon: <Bell size={16} /> });
      }
    } catch (error) {
      console.error("Failed to fetch opportunities:", error);
    } finally {
      setOppsLoading(false);
    }
  }, []);

  const fetchDigest = useCallback(async () => {
    setDigestLoading(true);
    setDigestProgress(0);

    // Simulate progress steps
    const progressSteps = [
      { pct: 15, msg: "Connecting to SAM.gov..." },
      { pct: 35, msg: "Scanning NAICS codes..." },
      { pct: 55, msg: "Scoring opportunities..." },
      { pct: 75, msg: "Generating proposal briefs..." },
      { pct: 90, msg: "Building executive summary..." },
    ];
    let stepIdx = 0;
    const progressInterval = setInterval(() => {
      if (stepIdx < progressSteps.length) {
        setDigestProgress(progressSteps[stepIdx].pct);
        stepIdx++;
      }
    }, 2500);

    try {
      const response = await fetch("/api/admin/agents/digest", { headers });
      clearInterval(progressInterval);
      setDigestProgress(100);
      if (response.ok) {
        const data = await response.json();
        setDigest(data.data);
        // Also refresh opportunities with the new data
        fetchOpportunities();
        setTimeout(() => {
          toast.success("Daily digest ready", {
            description: `${data.data.executive_summary.action_items_count} action items, ${data.data.executive_summary.strong_bid_recommendations} strong bid recommendations`,
            duration: 5000,
          });
        }, 300);
      } else {
        toast.error("Failed to generate digest", { description: "Check that API keys are configured correctly" });
      }
    } catch (error) {
      clearInterval(progressInterval);
      toast.error("Digest generation failed", { description: "Network error — try again" });
    } finally {
      setTimeout(() => {
        setDigestLoading(false);
        setDigestProgress(0);
      }, 500);
    }
  }, []);

  const runContractsAgent = async () => {
    setScanProgress("Initiating SAM.gov scan...");
    toast("SAM.gov scan started", { description: "Scanning NAICS codes and SDVOSB set-asides (this may take 15-20s)", icon: <Search size={16} /> });
    try {
      const response = await fetch("/api/admin/agents/contracts/run", { method: "POST", headers });
      if (response.ok) {
        const result = await response.json();
        setScanProgress(null);
        // Check if there were rate limiting or API errors
        const outputs = result?.data?.output || [];
        const alertOutput = outputs.find((o: any) => o.type === "alert" && o.severity === "warning");
        const reportOutput = outputs.find((o: any) => o.type === "report");
        const totalOpps = reportOutput?.data?.scan_summary?.total_unique_opportunities || 0;

        if (alertOutput && totalOpps === 0) {
          toast.warning("SAM.gov API rate limited", { description: "Using previously cached data. Try again in a few minutes.", duration: 6000 });
        } else if (totalOpps > 0) {
          toast.success("SAM.gov scan complete", { description: `${totalOpps} opportunities scored and stored` });
        } else {
          toast("Scan complete — no new opportunities found", { description: "Showing cached data if available", icon: <Search size={16} /> });
        }
        // Always fetch opportunities (will show cached data if scan returned 0)
        fetchOpportunities();
      } else {
        setScanProgress(null);
        toast.error("Scan failed", { description: "Check the agent logs for details" });
      }
    } catch {
      setScanProgress(null);
      toast.error("Scan failed", { description: "Network error" });
    }
  };

  // Load tab data on switch
  useEffect(() => {
    if (activeTab === "opportunities" && opportunities.length === 0) fetchOpportunities();
  }, [activeTab]);

  // Track tab direction for animation
  const handleTabSwitch = (tab: typeof activeTab) => {
    setPrevTab(activeTab);
    setActiveTab(tab);
  };

  // ============================================================
  // HANDLERS
  // ============================================================

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetFormData = () => {
    setFormData({
      title: "", client: "", value: "", type: "assessment" as const,
      status: "bidding" as const, startDate: "", endDate: "", description: "",
      samOpportunityId: "", solicitationNumber: "", naicsCode: "", setAside: "",
      setAsideDescription: "", department: "", agency: "", placeOfPerformance: "",
      contractingOfficer: "", contractingOfficerEmail: "", samLink: "",
      bidRecommendation: "", pursuitStrategy: "", capabilityAlignment: [],
      keyPersonnel: "", score: 0,
    });
    setSelectedOppForBid(null);
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
        const title = formData.title;
        resetFormData();
        if (selectedOppForBid) {
          toast.success("Contract bid generated from SAM.gov opportunity — review and submit", { description: `"${title}" added to pipeline`, icon: <CheckCircle2 size={16} /> });
        } else {
          toast.success("Contract bid created", { description: `"${title}" added to pipeline`, icon: <CheckCircle2 size={16} /> });
        }
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

  const mapNaicsToContractType = (naics: string, title: string, description: string): Contract["type"] => {
    const combined = `${naics} ${title} ${description}`.toLowerCase();

    if (naics.startsWith("541512") || naics.startsWith("541511")) return "systems";
    if (combined.includes("cyber") || combined.includes("security") || combined.includes("cmmc")) return "security";
    if (combined.includes("cloud") || combined.includes("migration") || combined.includes("modernization")) return "modernization";
    if (combined.includes("intelligence") || combined.includes("threat") || combined.includes("analytics")) return "intelligence";
    if (combined.includes("assessment") || combined.includes("audit") || combined.includes("compliance")) return "assessment";

    return "systems";
  };

  const generateAutoDescription = (opp: SamOpportunity, proposalBrief?: ProposalBrief): string => {
    const parts: string[] = [];
    parts.push(`Solicitation: ${opp.solicitationNumber || "Pending"}`);
    parts.push(`Agency: ${opp.department || opp.organization || "N/A"}`);
    parts.push(`NAICS: ${opp.naicsCode}`);
    if (opp.setAside) parts.push(`Set-Aside: ${opp.setAsideDescription || opp.setAside}`);
    if (opp.responseDeadline) parts.push(`Deadline: ${opp.responseDeadline}`);
    if (opp.description) parts.push(`\n${opp.description.substring(0, 300)}`);
    if (proposalBrief?.proposal_brief?.rationale) {
      parts.push(`\nBrief Analysis: ${proposalBrief.proposal_brief.rationale.substring(0, 200)}`);
    }
    return parts.join(" | ");
  };

  const generateBidFromOpportunity = (opp: SamOpportunity) => {
    // Find matching proposal brief
    const matchingBrief = digest?.proposal_pipeline?.proposal_briefs?.find(
      (b: ProposalBrief) =>
        b.opportunity.solicitation === opp.solicitationNumber ||
        b.opportunity.title.toLowerCase() === opp.title.toLowerCase()
    );

    const today = new Date().toISOString().split('T')[0];
    const endDate = opp.responseDeadline
      ? opp.responseDeadline.split('T')[0]
      : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const contractType = mapNaicsToContractType(opp.naicsCode, opp.title, opp.description);
    const autoDescription = generateAutoDescription(opp, matchingBrief);

    const newFormData = {
      title: opp.title,
      client: opp.department || opp.organization || opp.office || "N/A",
      value: (opp.awardAmount || 0).toString(),
      type: contractType,
      status: "bidding" as const,
      startDate: today,
      endDate: endDate,
      description: autoDescription,
      samOpportunityId: opp.noticeId,
      solicitationNumber: opp.solicitationNumber,
      naicsCode: opp.naicsCode,
      setAside: opp.setAside,
      setAsideDescription: opp.setAsideDescription,
      department: opp.department,
      agency: opp.organization,
      placeOfPerformance: [opp.placeOfPerformanceCity, opp.placeOfPerformance].filter(Boolean).join(", "),
      contractingOfficer: opp.pointOfContact?.fullName || "",
      contractingOfficerEmail: opp.pointOfContact?.email || "",
      samLink: opp.uiLink,
      bidRecommendation: matchingBrief?.proposal_brief?.bid_recommendation || "",
      pursuitStrategy: matchingBrief?.proposal_brief?.pursuit_strategy || "",
      capabilityAlignment: matchingBrief?.proposal_brief?.capability_alignment || [],
      keyPersonnel: matchingBrief?.proposal_brief?.key_personnel_needed || "",
      score: opp.score,
    };

    setFormData(newFormData as any);
    setSelectedOppForBid(opp);
    setShowModal(true);
    toast.success("Contract bid form pre-filled", { description: `From SAM.gov opportunity: ${opp.title.substring(0, 50)}...` });
  };

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

  const tabOrder = ["pipeline", "opportunities", "proposals", "digest"];
  const tabDirection = tabOrder.indexOf(activeTab) >= tabOrder.indexOf(prevTab) ? 1 : -1;

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with Greeting */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-white break-words" style={{ fontFamily: "Sora, sans-serif" }}>
                Contract <span className="gradient-text">Operations Center</span>
              </h1>
              <p className="text-gray-400 mt-1 text-xs sm:text-sm break-words">{getGreeting()}, Brian — {getQuickInsight(opportunities, contracts)}</p>
            </div>
            <div className="flex gap-2 shrink-0 flex-wrap justify-end">
              {activeTab === "pipeline" && (
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setShowModal(true)} className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-[#0066ff] text-white hover:bg-[#0052cc] transition-colors text-xs sm:text-sm rounded whitespace-nowrap">
                  <Plus size={14} className="sm:size-4" /> <span className="hidden sm:inline">Add Contract</span><span className="sm:hidden">Add</span>
                </motion.button>
              )}
              {activeTab === "opportunities" && (
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={runContractsAgent} disabled={!!scanProgress} className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-[#8b5cf6] text-white hover:bg-[#7c3aed] transition-colors text-xs sm:text-sm rounded disabled:opacity-60 whitespace-nowrap">
                  <RefreshCw size={14} className={scanProgress ? "animate-spin sm:size-4" : "sm:size-4"} /> <span className="hidden sm:inline">{scanProgress || "Scan SAM.gov"}</span><span className="sm:hidden">{scanProgress ? "..." : "Scan"}</span>
                </motion.button>
              )}
              {(activeTab === "digest" || activeTab === "proposals") && (
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={fetchDigest} disabled={digestLoading} className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-[#00e5a0] text-black hover:bg-[#00cc8a] transition-colors text-xs sm:text-sm rounded disabled:opacity-60 font-medium whitespace-nowrap">
                  <Zap size={14} className="sm:size-4" /> <span className="hidden sm:inline">{digestLoading ? "Generating..." : "Generate Digest"}</span><span className="sm:hidden">{digestLoading ? "..." : "Gen"}</span>
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Tab Navigation with indicator */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="relative">
          <div className="flex gap-1 overflow-x-auto border-b border-white/10 pb-0 -mx-4 sm:mx-0 px-4 sm:px-0">
            {([
              { key: "pipeline", label: "Bidding Pipeline", icon: FileText, count: contracts.length },
              { key: "opportunities", label: "SAM.gov Intelligence", icon: Search, count: opportunities.length },
              { key: "proposals", label: "Proposal Briefs", icon: Target, count: digest?.proposal_pipeline?.proposal_briefs?.length || 0 },
              { key: "digest", label: "Daily Digest", icon: Zap, count: digest?.action_items?.length || 0 },
            ] as const).map(({ key, label, icon: Icon, count }) => (
              <button key={key} onClick={() => handleTabSwitch(key)} className={`relative flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-3 text-xs sm:text-sm font-mono uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === key ? "text-white" : "text-gray-500 hover:text-gray-300"}`}>
                <Icon size={12} className="sm:size-4" />
                <span className="hidden xs:inline">{label}</span>
                {count > 0 && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-[8px] sm:text-[9px] font-mono px-1 sm:px-1.5 py-0.5 rounded-full bg-white/10 text-gray-400">
                    {count}
                  </motion.span>
                )}
                {activeTab === key && (
                  <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0066ff]" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Tab Content with smooth transitions */}
        <AnimatePresence mode="wait">
          {/* ============================================================ */}
          {/* TAB: PIPELINE */}
          {/* ============================================================ */}
          {activeTab === "pipeline" && (
            <motion.div key="pipeline" initial={{ opacity: 0, x: 20 * tabDirection }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 * tabDirection }} transition={{ duration: 0.25, ease: "easeOut" }} className="space-y-6">
              {/* KPI Cards */}
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => <SkeletonKPI key={i} />)}
                </div>
              ) : (
                <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: "Total Pipeline Value", value: formatValue(stats.totalValue), color: "#fff" },
                    { label: "Active Contracts", value: stats.activeCount, color: "#00e5a0" },
                    { label: "Bidding", value: stats.biddingCount, color: "#ffb800" },
                    { label: "Win Rate", value: `${stats.winRate}%`, color: "#0066ff" },
                  ].map((kpi, i) => (
                    <motion.div key={i} variants={staggerItem} whileHover={{ y: -2, transition: { duration: 0.2 } }} className="tech-card p-5">
                      <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">{kpi.label}</p>
                      <p className="text-2xl font-bold mt-3" style={{ color: kpi.color }}>{typeof kpi.value === "number" ? <AnimatedCounter value={kpi.value} color={kpi.color} /> : kpi.value}</p>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {/* Status Filter */}
              <div className="flex gap-2 overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                {(["all", "bidding", "review", "active", "completed"] as const).map((status) => (
                  <motion.button key={status} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setStatusFilter(status)} className={`relative px-3 sm:px-4 py-2 text-xs sm:text-sm font-mono uppercase tracking-widest whitespace-nowrap transition-colors rounded ${statusFilter === status ? "text-white" : "bg-white/5 text-gray-400 hover:text-white"}`}>
                    {statusFilter === status && <motion.div layoutId="statusFilter" className="absolute inset-0 bg-[#0066ff] rounded" transition={{ type: "spring", stiffness: 400, damping: 30 }} />}
                    <span className="relative z-10">{status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}</span>
                  </motion.button>
                ))}
              </div>

              {/* Contracts Grid */}
              {loading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                  {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : filteredContracts.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="tech-card p-6 sm:p-10 text-center">
                  <FileText size={36} className="mx-auto mb-3 text-gray-600" />
                  <p className="text-gray-400 mb-1">No contracts found</p>
                  <p className="text-gray-500 text-sm">Add a contract to get started, or scan SAM.gov for opportunities.</p>
                  <motion.button whileHover={{ scale: 1.03 }} onClick={() => handleTabSwitch("opportunities")} className="mt-4 text-[#0066ff] text-xs sm:text-sm flex items-center justify-center gap-1 mx-auto hover:underline">
                    Browse SAM.gov opportunities <ArrowRight size={14} />
                  </motion.button>
                </motion.div>
              ) : (
                <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                  {filteredContracts.map((contract) => (
                    <motion.div key={contract.id} variants={staggerItem} whileHover={{ y: -2, transition: { duration: 0.2 } }} className="tech-card p-5 space-y-4 hover:border-white/15 transition-colors">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-bold text-sm sm:text-lg break-words" style={{ fontFamily: "Sora, sans-serif" }}>{contract.title}</h3>
                          <p className="text-gray-400 text-xs sm:text-sm mt-1 break-words">{contract.client}</p>
                        </div>
                        <span className="text-[9px] sm:text-[10px] font-mono px-2 py-1 border rounded shrink-0" style={{ borderColor: getStatusColor(contract.status), color: getStatusColor(contract.status) }}>
                          {contract.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-4 sm:gap-4">
                        <div>
                          <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Value</p>
                          <p className="text-white font-bold mt-1">{formatValue(contract.value)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Type</p>
                          <span className="text-[10px] font-mono px-2 py-1 border border-white/20 text-gray-300 inline-block mt-1 rounded">
                            {contract.type.charAt(0).toUpperCase() + contract.type.slice(1)}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(contract.startDate).toLocaleDateString()} - {new Date(contract.endDate).toLocaleDateString()}
                      </div>
                      {contract.description && <p className="text-sm text-gray-400 leading-relaxed">{contract.description}</p>}
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ============================================================ */}
          {/* TAB: SAM.GOV OPPORTUNITIES */}
          {/* ============================================================ */}
          {activeTab === "opportunities" && (
            <motion.div key="opportunities" initial={{ opacity: 0, x: 20 * tabDirection }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 * tabDirection }} transition={{ duration: 0.25, ease: "easeOut" }} className="space-y-6">
              {/* KPI Row */}
              <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Total Tracked", value: opportunities.length, color: "#fff" },
                  { label: "High Value (30+)", value: opportunities.filter(o => o.score >= 30).length, color: "#00e5a0" },
                  { label: "SDVOSB Set-Asides", value: opportunities.filter(o => o.setAside === "SDVOSBC" || o.setAside === "SDVOSBS").length, color: "#8b5cf6" },
                  { label: "Urgent (7 days)", value: opportunities.filter(o => { const d = daysUntil(o.responseDeadline); return d !== null && d <= 7; }).length, color: "#ff4444" },
                ].map((kpi, i) => (
                  <motion.div key={i} variants={staggerItem} whileHover={{ y: -2 }} className="tech-card p-5">
                    <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">{kpi.label}</p>
                    <p className="text-2xl font-bold mt-3"><AnimatedCounter value={kpi.value} color={kpi.color} /></p>
                  </motion.div>
                ))}
              </motion.div>

              {/* Search and Filters */}
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <div className="relative flex-1 min-w-0">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 shrink-0" />
                  <input type="text" placeholder="Search..." value={oppSearch} onChange={(e) => setOppSearch(e.target.value)} className="w-full bg-white/5 border border-white/10 text-white pl-9 pr-3 py-2 sm:py-2.5 outline-none text-xs sm:text-sm placeholder-gray-600 rounded focus:border-[#0066ff]/50 transition-colors" />
                </div>
                <select value={oppScoreFilter} onChange={(e) => setOppScoreFilter(Number(e.target.value))} className="bg-white/5 border border-white/10 text-white px-3 py-2 sm:py-2.5 outline-none text-xs sm:text-sm rounded w-full sm:w-auto">
                  <option value={0}>All Scores</option>
                  <option value={15}>Score 15+ (Moderate)</option>
                  <option value={25}>Score 25+ (Good)</option>
                  <option value={30}>Score 30+ (Strong)</option>
                  <option value={40}>Score 40+ (Top Match)</option>
                </select>
              </motion.div>

              {/* Scan Progress */}
              <AnimatePresence>
                {scanProgress && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="tech-card p-4 border-l-2 border-[#8b5cf6] flex items-center gap-3">
                      <RefreshCw size={16} className="animate-spin text-[#8b5cf6] shrink-0" />
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">{scanProgress}</p>
                        <div className="w-full h-1 bg-white/10 rounded mt-2 overflow-hidden">
                          <motion.div className="h-full bg-[#8b5cf6] rounded" initial={{ width: "5%" }} animate={{ width: "80%" }} transition={{ duration: 12, ease: "linear" }} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Opportunities List */}
              {oppsLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => <SkeletonOpportunity key={i} />)}
                </div>
              ) : filteredOpps.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="tech-card p-10 text-center">
                  <Search size={36} className="mx-auto mb-3 text-gray-600" />
                  <p className="text-gray-400 mb-1">No opportunities found</p>
                  <p className="text-gray-500 text-sm mb-4">Click "Scan SAM.gov" to fetch the latest federal contract opportunities matching your NAICS codes and set-asides.</p>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={runContractsAgent} className="px-4 py-2 bg-[#8b5cf6] text-white text-sm rounded hover:bg-[#7c3aed] transition-colors">
                    <Search size={14} className="inline mr-2" /> Scan SAM.gov Now
                  </motion.button>
                </motion.div>
              ) : (
                <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
                  <p className="text-gray-500 text-xs font-mono">{filteredOpps.length} opportunities — sorted by match score</p>
                  {filteredOpps.map((opp) => {
                    const days = daysUntil(opp.responseDeadline);
                    const isExpanded = expandedOpp === opp.noticeId;
                    return (
                      <motion.div key={opp.noticeId} variants={staggerItem} layout className="tech-card overflow-hidden hover:border-white/15 transition-colors">
                        <div className="p-4 sm:p-5 cursor-pointer" onClick={() => setExpandedOpp(isExpanded ? null : opp.noticeId)}>
                          <div className="flex flex-col sm:flex-row items-start sm:justify-between sm:items-start gap-2 sm:gap-3">
                            <div className="flex-1 min-w-0 w-full">
                              <div className="flex items-center gap-1 mb-2 flex-wrap">
                                <motion.span whileHover={{ scale: 1.05 }} className="text-[9px] sm:text-[10px] font-mono px-2 py-0.5 border rounded shrink-0" style={{ borderColor: getScoreColor(opp.score), color: getScoreColor(opp.score) }}>
                                  {getScoreLabel(opp.score)} ({opp.score})
                                </motion.span>
                                {opp.setAside && opp.setAside !== "" && (
                                  <span className="text-[9px] sm:text-[10px] font-mono px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded shrink-0">
                                    {opp.setAsideDescription?.substring(0, 10) || opp.setAside?.substring(0, 10)}
                                  </span>
                                )}
                                {days !== null && days <= 7 && (
                                  <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-[9px] sm:text-[10px] font-mono px-2 py-0.5 bg-red-500/20 text-red-300 border border-red-500/30 rounded flex items-center gap-1 shrink-0">
                                    <Clock size={8} className="sm:size-3" /> {days}d
                                  </motion.span>
                                )}
                              </div>
                              <h3 className="text-white font-bold text-xs sm:text-sm leading-tight break-words">{opp.title}</h3>
                              <p className="text-gray-500 text-xs mt-1 break-words">{opp.organization}</p>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3 shrink-0 self-start sm:self-start">
                              <div className="text-right hidden sm:block">
                                <p className="text-[9px] font-mono text-gray-600">NAICS {opp.naicsCode}</p>
                                <p className="text-[9px] font-mono text-gray-500">{opp.type?.substring(0, 10)}</p>
                              </div>
                              <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                <ChevronDown size={14} className="text-gray-500 sm:size-4" />
                              </motion.div>
                            </div>
                          </div>
                        </div>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: "easeInOut" }} className="border-t border-white/5 overflow-hidden">
                              <div className="p-3 sm:p-5 space-y-4 sm:space-y-5 overflow-x-auto">
                                {/* Core Details Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 text-xs">
                                  <div className="min-w-0"><p className="text-gray-600 font-mono uppercase text-[9px] sm:text-[10px] mb-1 flex items-center gap-1"><Clipboard size={8} className="sm:size-2.5" /> Solicitation</p><p className="text-gray-300 font-medium text-xs break-words">{opp.solicitationNumber || "N/A"}</p></div>
                                  <div className="min-w-0"><p className="text-gray-600 font-mono uppercase text-[9px] sm:text-[10px] mb-1">Posted</p><p className="text-gray-300 text-xs">{opp.postedDate || "N/A"}</p></div>
                                  <div className="min-w-0"><p className="text-gray-600 font-mono uppercase text-[9px] sm:text-[10px] mb-1 flex items-center gap-1"><Clock size={8} className="sm:size-2.5" /> Deadline</p><p className={`text-xs ${days !== null && days <= 7 ? "text-red-400 font-bold" : "text-gray-300"}`}>{opp.responseDeadline ? `${opp.responseDeadline}${days !== null ? ` (${days}d)` : ""}` : "Open"}</p></div>
                                  <div className="min-w-0"><p className="text-gray-600 font-mono uppercase text-[9px] sm:text-[10px] mb-1">Archive</p><p className="text-gray-300 text-xs">{opp.archiveDate || "N/A"}</p></div>
                                </div>

                                {/* Agency & Classification */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs">
                                  <div className="bg-white/[0.02] border border-white/5 p-3 rounded space-y-2 min-w-0">
                                    <p className="text-gray-500 font-mono uppercase text-[9px] sm:text-[10px] flex items-center gap-1"><Building2 size={8} className="sm:size-2.5 shrink-0" /> Contracting Agency</p>
                                    <p className="text-gray-200 text-xs sm:text-sm font-medium break-words">{opp.organization || "N/A"}</p>
                                    {opp.department && <p className="text-gray-400 text-[10px] sm:text-[11px] break-words">Dept: {opp.department}</p>}
                                    {opp.subTier && <p className="text-gray-400 text-[10px] sm:text-[11px] break-words">Sub: {opp.subTier?.substring(0, 20)}</p>}
                                    {opp.office && <p className="text-gray-400 text-[10px] sm:text-[11px] break-words">Office: {opp.office}</p>}
                                  </div>
                                  <div className="bg-white/[0.02] border border-white/5 p-3 rounded space-y-2 min-w-0">
                                    <p className="text-gray-500 font-mono uppercase text-[9px] sm:text-[10px] flex items-center gap-1"><MapPin size={8} className="sm:size-2.5 shrink-0" /> Performance Location</p>
                                    <p className="text-gray-200 text-xs sm:text-sm font-medium break-words">
                                      {[opp.placeOfPerformanceCity, opp.placeOfPerformance, opp.placeOfPerformanceCountry].filter(Boolean).join(", ") || "Not Specified"}
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-1">
                                      <div><p className="text-gray-500 text-[9px] sm:text-[10px]">NAICS</p><p className="text-cyan-400 font-mono text-xs">{opp.naicsCode || "N/A"}</p></div>
                                      {opp.classificationCode && <div><p className="text-gray-500 text-[9px] sm:text-[10px]">PSC</p><p className="text-cyan-400 font-mono text-xs">{opp.classificationCode}</p></div>}
                                    </div>
                                  </div>
                                </div>

                                {/* Description */}
                                {opp.description && (
                                  <div className="min-w-0">
                                    <p className="text-gray-600 font-mono uppercase text-[9px] sm:text-[10px] mb-1.5 flex items-center gap-1"><BookOpen size={8} className="sm:size-2.5 shrink-0" /> Description</p>
                                    <p className="text-gray-300 text-xs sm:text-sm leading-relaxed line-clamp-4 break-words">{opp.description}</p>
                                  </div>
                                )}

                                {/* Award Info (if awarded) */}
                                {opp.awardAmount && (
                                  <div className="bg-emerald-500/5 border border-emerald-500/20 p-3 rounded min-w-0">
                                    <p className="text-emerald-400 font-mono uppercase text-[9px] sm:text-[10px] mb-1.5 flex items-center gap-1"><Award size={8} className="sm:size-2.5 shrink-0" /> Award Information</p>
                                    <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4 text-xs">
                                      <div className="min-w-0"><p className="text-gray-500 text-[9px] sm:text-[10px]">Amount</p><p className="text-emerald-300 font-bold text-xs sm:text-sm break-words">${Number(opp.awardAmount).toLocaleString()}</p></div>
                                      {opp.awardDate && <div className="min-w-0"><p className="text-gray-500 text-[9px] sm:text-[10px]">Date</p><p className="text-gray-300 text-xs">{opp.awardDate}</p></div>}
                                      {opp.awardNumber && <div className="min-w-0"><p className="text-gray-500 text-[9px] sm:text-[10px]">Award #</p><p className="text-gray-300 text-xs break-words">{opp.awardNumber}</p></div>}
                                      {opp.awardee && <div className="min-w-0"><p className="text-gray-500 text-[9px] sm:text-[10px]">Awardee</p><p className="text-gray-300 text-xs break-words">{opp.awardee}</p></div>}
                                    </div>
                                  </div>
                                )}

                                {/* Match Reasons */}
                                {opp.reasons && opp.reasons.length > 0 && (
                                  <div className="min-w-0">
                                    <p className="text-gray-600 font-mono uppercase text-[9px] sm:text-[10px] mb-2 flex items-center gap-1"><Target size={8} className="sm:size-2.5 shrink-0" /> Match Reasons</p>
                                    <div className="flex flex-wrap gap-1">
                                      {opp.reasons.map((r: string, i: number) => (
                                        <motion.span key={i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} className="text-[8px] sm:text-[10px] font-mono px-2 py-0.5 bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded break-words">{r}</motion.span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Point of Contact */}
                                {opp.pointOfContact && (
                                  <div className="bg-white/[0.02] border border-white/5 p-3 rounded min-w-0">
                                    <p className="text-gray-500 font-mono uppercase text-[9px] sm:text-[10px] mb-2 flex items-center gap-1"><User size={8} className="sm:size-2.5 shrink-0" /> Point of Contact</p>
                                    <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4 text-xs">
                                      {opp.pointOfContact.fullName && <span className="text-gray-300 flex items-center gap-1 min-w-0"><User size={8} className="text-gray-500 shrink-0" /> <span className="truncate">{opp.pointOfContact.fullName}</span></span>}
                                      {opp.pointOfContact.email && <a href={`mailto:${opp.pointOfContact.email}`} className="text-[#0066ff] flex items-center gap-1 hover:underline min-w-0"><Mail size={8} className="shrink-0" /> <span className="truncate">{opp.pointOfContact.email}</span></a>}
                                      {opp.pointOfContact.phone && <span className="text-gray-300 flex items-center gap-1 min-w-0"><Phone size={8} className="text-gray-500 shrink-0" /> <span className="truncate">{opp.pointOfContact.phone}</span></span>}
                                    </div>
                                    {opp.additionalContacts && opp.additionalContacts.length > 0 && (
                                      <div className="mt-2 pt-2 border-t border-white/5">
                                        <p className="text-gray-600 text-[10px] font-mono mb-1">Additional Contacts</p>
                                        {opp.additionalContacts.map((c: any, ci: number) => (
                                          <p key={ci} className="text-gray-400 text-xs">{c.fullName} — {c.email}</p>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex flex-wrap gap-2 sm:gap-3">
                                  {opp.uiLink && opp.uiLink !== "null" && (
                                    <a href={opp.uiLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 sm:px-3 py-1.5 bg-[#0066ff]/10 border border-[#0066ff]/30 text-[#0066ff] text-xs rounded hover:bg-[#0066ff]/20 transition-colors whitespace-nowrap">
                                      <ExternalLink size={10} className="sm:size-3" /> <span className="hidden sm:inline">View on SAM.gov</span><span className="sm:hidden">SAM.gov</span>
                                    </a>
                                  )}
                                  <button onClick={(e) => { e.stopPropagation(); handleTabSwitch("digest"); fetchDigest(); }} className="flex items-center gap-1 px-2 sm:px-3 py-1.5 bg-[#00e5a0]/10 border border-[#00e5a0]/30 text-[#00e5a0] text-xs rounded hover:bg-[#00e5a0]/20 transition-colors whitespace-nowrap">
                                    <Target size={10} className="sm:size-3" /> <span className="hidden sm:inline">Generate Brief</span><span className="sm:hidden">Brief</span>
                                  </button>
                                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={(e) => { e.stopPropagation(); generateBidFromOpportunity(opp); }} className="flex items-center gap-1 px-2 sm:px-3 py-1.5 bg-[#0066ff]/10 border border-[#0066ff]/30 text-[#0066ff] text-xs rounded hover:bg-[#0066ff]/20 transition-colors whitespace-nowrap font-medium">
                                    <Briefcase size={10} className="sm:size-3" /> <span className="hidden sm:inline">Generate Bid</span><span className="sm:hidden">Bid</span>
                                  </motion.button>
                                  <button onClick={(e) => { e.stopPropagation(); setBiddingStepsOpp(biddingStepsOpp === opp.noticeId ? null : opp.noticeId); }} className="flex items-center gap-1 px-2 sm:px-3 py-1.5 bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 text-[#8b5cf6] text-xs rounded hover:bg-[#8b5cf6]/20 transition-colors whitespace-nowrap">
                                    <ListChecks size={10} className="sm:size-3" /> <span className="hidden sm:inline">{biddingStepsOpp === opp.noticeId ? "Hide" : "Show"} Steps</span><span className="sm:hidden">{biddingStepsOpp === opp.noticeId ? "Hide" : "Show"}</span>
                                  </button>
                                  {opp.additionalInfo && (
                                    <a href={opp.additionalInfo} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 sm:px-3 py-1.5 bg-white/5 border border-white/10 text-gray-300 text-xs rounded hover:bg-white/10 transition-colors whitespace-nowrap">
                                      <BookOpen size={10} className="sm:size-3" /> <span className="hidden sm:inline">More Info</span><span className="sm:hidden">Info</span>
                                    </a>
                                  )}
                                </div>

                                {/* Bidding Process Steps */}
                                <AnimatePresence>
                                  {biddingStepsOpp === opp.noticeId && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                                      <div className="bg-[#8b5cf6]/5 border border-[#8b5cf6]/20 rounded p-5 space-y-4">
                                        <h4 className="text-white font-bold text-sm flex items-center gap-2"><ListChecks size={14} className="text-[#8b5cf6]" /> Bidding Process — {opp.type || "Solicitation"}</h4>

                                        {/* Step 1: Search & Identify */}
                                        <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }} className="flex gap-3">
                                          <div className="flex flex-col items-center">
                                            <div className="w-7 h-7 bg-[#00e5a0]/20 border border-[#00e5a0]/40 rounded-full flex items-center justify-center text-[#00e5a0] font-mono text-xs font-bold">1</div>
                                            <div className="w-0.5 flex-1 bg-white/10 mt-1" />
                                          </div>
                                          <div className="flex-1 pb-4">
                                            <p className="text-white font-bold text-xs">Search & Identify Opportunity</p>
                                            <p className="text-gray-400 text-xs mt-1 leading-relaxed">This opportunity was identified on SAM.gov matching NAICS {opp.naicsCode}{opp.setAside ? ` with ${opp.setAsideDescription || opp.setAside} set-aside` : ""}. Solicitation: {opp.solicitationNumber || "Pending"}.</p>
                                            <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 bg-green-500/10 text-green-400 text-[10px] font-mono border border-green-500/20 rounded"><CheckCircle2 size={9} /> COMPLETED</span>
                                          </div>
                                        </motion.div>

                                        {/* Step 2: Review Solicitation */}
                                        <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="flex gap-3">
                                          <div className="flex flex-col items-center">
                                            <div className="w-7 h-7 bg-[#ffb800]/20 border border-[#ffb800]/40 rounded-full flex items-center justify-center text-[#ffb800] font-mono text-xs font-bold">2</div>
                                            <div className="w-0.5 flex-1 bg-white/10 mt-1" />
                                          </div>
                                          <div className="flex-1 pb-4">
                                            <p className="text-white font-bold text-xs">Review Solicitation / RFP</p>
                                            <p className="text-gray-400 text-xs mt-1 leading-relaxed">Carefully read the {opp.type === "Solicitation" || opp.type === "Combined Synopsis/Solicitation" ? "solicitation" : opp.type === "Sources Sought" ? "Sources Sought notice" : "pre-solicitation notice"} to understand scope of work, evaluation criteria, and compliance requirements.{opp.description ? ` Key focus: "${opp.description.substring(0, 100)}..."` : ""}</p>
                                            {opp.uiLink && <a href={opp.uiLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1.5 text-[#0066ff] text-[10px] hover:underline"><ExternalLink size={9} /> Read full solicitation on SAM.gov</a>}
                                          </div>
                                        </motion.div>

                                        {/* Step 3: Assess Readiness */}
                                        <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }} className="flex gap-3">
                                          <div className="flex flex-col items-center">
                                            <div className="w-7 h-7 bg-[#0066ff]/20 border border-[#0066ff]/40 rounded-full flex items-center justify-center text-[#0066ff] font-mono text-xs font-bold">3</div>
                                            <div className="w-0.5 flex-1 bg-white/10 mt-1" />
                                          </div>
                                          <div className="flex-1 pb-4">
                                            <p className="text-white font-bold text-xs">Assess Business Readiness</p>
                                            <p className="text-gray-400 text-xs mt-1 leading-relaxed">Verify SISG's qualifications align: SDVOSB/8(a) status{opp.setAside ? ` (required: ${opp.setAsideDescription || opp.setAside})` : ""}, NAICS code {opp.naicsCode} capability, relevant past performance, and available key personnel. Check SAM.gov registration is active and CAGE code is current.</p>
                                            <div className="flex flex-wrap gap-1 mt-2">
                                              {["SAM Registration", "SDVOSB Cert", "8(a) Status", "CAGE Code", "Past Performance"].map((item, i) => (
                                                <span key={i} className="text-[10px] font-mono px-2 py-0.5 bg-white/5 text-gray-400 border border-white/10 rounded">{item}</span>
                                              ))}
                                            </div>
                                          </div>
                                        </motion.div>

                                        {/* Step 4: Prepare Proposal */}
                                        <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="flex gap-3">
                                          <div className="flex flex-col items-center">
                                            <div className="w-7 h-7 bg-[#00d4ff]/20 border border-[#00d4ff]/40 rounded-full flex items-center justify-center text-[#00d4ff] font-mono text-xs font-bold">4</div>
                                            <div className="w-0.5 flex-1 bg-white/10 mt-1" />
                                          </div>
                                          <div className="flex-1 pb-4">
                                            <p className="text-white font-bold text-xs">Prepare & Submit Proposal</p>
                                            <p className="text-gray-400 text-xs mt-1 leading-relaxed">Draft a compliant, priced proposal by the deadline{opp.responseDeadline ? ` (${opp.responseDeadline}${days !== null ? `, ${days} days remaining` : ""})` : ""}. Include technical approach, management plan, past performance references, and cost volume. Ensure compliance with all solicitation instructions.</p>
                                            {opp.pointOfContact && <p className="text-gray-500 text-[10px] mt-1.5">Submit questions to: {opp.pointOfContact.fullName} ({opp.pointOfContact.email})</p>}
                                          </div>
                                        </motion.div>

                                        {/* Step 5: Subcontracting Strategy */}
                                        <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }} className="flex gap-3">
                                          <div className="flex flex-col items-center">
                                            <div className="w-7 h-7 bg-[#ff6b35]/20 border border-[#ff6b35]/40 rounded-full flex items-center justify-center text-[#ff6b35] font-mono text-xs font-bold">5</div>
                                            <div className="w-0.5 flex-1 bg-white/10 mt-1" />
                                          </div>
                                          <div className="flex-1 pb-4">
                                            <p className="text-white font-bold text-xs">Teaming & Subcontracting Strategy</p>
                                            <p className="text-gray-400 text-xs mt-1 leading-relaxed">Evaluate whether to pursue as prime or sub-contractor. Leverage SBA mentor-protege programs and SDVOSB joint ventures. Identify teaming partners with complementary capabilities and past performance in {opp.department || opp.organization?.split(".")?.[0] || "this agency"}.</p>
                                          </div>
                                        </motion.div>

                                        {/* Step 6: Post-Submission */}
                                        <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="flex gap-3">
                                          <div className="flex flex-col items-center">
                                            <div className="w-7 h-7 bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 rounded-full flex items-center justify-center text-[#8b5cf6] font-mono text-xs font-bold">6</div>
                                          </div>
                                          <div className="flex-1">
                                            <p className="text-white font-bold text-xs">Post-Submission & Follow-Up</p>
                                            <p className="text-gray-400 text-xs mt-1 leading-relaxed">Monitor SAM.gov for amendments, Q&A updates, and award notices. Prepare for potential discussions or Best and Final Offer (BAFO). If awarded, coordinate contract kickoff. If not awarded, request a debrief to improve future proposals.</p>
                                          </div>
                                        </motion.div>

                                        <div className="pt-2 border-t border-white/5 flex gap-2">
                                          <button onClick={(e) => { e.stopPropagation(); handleTabSwitch("digest"); fetchDigest(); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00e5a0]/10 border border-[#00e5a0]/30 text-[#00e5a0] text-xs rounded hover:bg-[#00e5a0]/20 transition-colors">
                                            <Zap size={12} /> Generate AI Proposal Brief
                                          </button>
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ============================================================ */}
          {/* TAB: PROPOSAL BRIEFS */}
          {/* ============================================================ */}
          {activeTab === "proposals" && (
            <motion.div key="proposals" initial={{ opacity: 0, x: 20 * tabDirection }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 * tabDirection }} transition={{ duration: 0.25, ease: "easeOut" }} className="space-y-6">
              {digest?.proposal_pipeline?.proposal_briefs && digest.proposal_pipeline.proposal_briefs.length > 0 ? (
                <>
                  {/* Pipeline Summary KPIs */}
                  {digest.proposal_pipeline.pipeline_summary && (
                    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
                      {[
                        { label: "Database", value: digest.proposal_pipeline.pipeline_summary.total_in_database, color: "#fff" },
                        { label: "Actionable", value: digest.proposal_pipeline.pipeline_summary.actionable_opportunities, color: "#0066ff" },
                        { label: "Briefs", value: digest.proposal_pipeline.pipeline_summary.briefs_generated, color: "#8b5cf6" },
                        { label: "Strong", value: digest.proposal_pipeline.pipeline_summary.strong_bids, color: "#00e5a0" },
                        { label: "Recommended", value: digest.proposal_pipeline.pipeline_summary.recommended_bids, color: "#ffb800" },
                      ].map((kpi, i) => (
                        <motion.div key={i} variants={staggerItem} whileHover={{ y: -2 }} className="tech-card p-3 sm:p-4">
                          <p className="text-[8px] sm:text-[9px] font-mono text-gray-600 uppercase tracking-widest break-words">{kpi.label}</p>
                          <p className="text-lg sm:text-xl font-bold mt-2"><AnimatedCounter value={kpi.value} color={kpi.color} /></p>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}

                  {/* Proposal Brief Cards */}
                  <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
                    {digest.proposal_pipeline.proposal_briefs.map((brief: ProposalBrief, idx: number) => {
                      const isExpanded = expandedBrief === idx;
                      return (
                        <motion.div key={idx} variants={staggerItem} layout className="tech-card overflow-hidden hover:border-white/15 transition-colors">
                          <div className="p-4 sm:p-5 cursor-pointer" onClick={() => setExpandedBrief(isExpanded ? null : idx)}>
                            <div className="flex flex-col sm:flex-row items-start sm:justify-between sm:items-start gap-2 sm:gap-3">
                              <div className="flex-1 min-w-0 w-full">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <motion.span whileHover={{ scale: 1.05 }} className="text-[9px] sm:text-[10px] font-mono px-2 py-0.5 border rounded font-bold shrink-0" style={{ borderColor: getBidColor(brief.proposal_brief.bid_recommendation), color: getBidColor(brief.proposal_brief.bid_recommendation) }}>
                                    {brief.proposal_brief.bid_recommendation?.substring(0, 12)}
                                  </motion.span>
                                  <span className="text-[9px] sm:text-[10px] font-mono text-gray-500 shrink-0">Score: {brief.opportunity.score}</span>
                                  {brief.opportunity.days_remaining !== null && brief.opportunity.days_remaining <= 14 && (
                                    <motion.span animate={brief.opportunity.days_remaining <= 7 ? { opacity: [1, 0.5, 1] } : {}} transition={{ duration: 1.5, repeat: Infinity }} className="text-[9px] sm:text-[10px] font-mono px-2 py-0.5 bg-red-500/20 text-red-300 border border-red-500/30 rounded flex items-center gap-1 shrink-0">
                                      <Clock size={8} className="sm:size-2.5" /> {brief.opportunity.days_remaining}d
                                    </motion.span>
                                  )}
                                </div>
                                <h3 className="text-white font-bold text-xs sm:text-sm leading-tight break-words">{brief.opportunity.title}</h3>
                                <p className="text-gray-500 text-xs mt-1 break-words">{brief.opportunity.organization}</p>
                              </div>
                              <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }} className="shrink-0 self-start sm:self-start">
                                <ChevronDown size={14} className="text-gray-500 sm:size-4" />
                              </motion.div>
                            </div>
                          </div>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: "easeInOut" }} className="border-t border-white/5 overflow-hidden">
                                <div className="p-3 sm:p-5 space-y-4 sm:space-y-5 overflow-x-auto">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 text-xs">
                                    <div className="min-w-0"><p className="text-gray-600 font-mono uppercase text-[9px] sm:text-[10px] mb-1">Solicitation</p><p className="text-gray-300 text-xs break-words">{brief.opportunity.solicitation}</p></div>
                                    <div className="min-w-0"><p className="text-gray-600 font-mono uppercase text-[9px] sm:text-[10px] mb-1">NAICS</p><p className="text-gray-300 text-xs">{brief.opportunity.naics}</p></div>
                                    <div className="min-w-0"><p className="text-gray-600 font-mono uppercase text-[9px] sm:text-[10px] mb-1">Set-Aside</p><p className="text-purple-300 text-xs break-words">{brief.opportunity.set_aside}</p></div>
                                    <div className="min-w-0"><p className="text-gray-600 font-mono uppercase text-[9px] sm:text-[10px] mb-1">Deadline</p><p className={`text-xs ${brief.opportunity.days_remaining && brief.opportunity.days_remaining <= 7 ? "text-red-400 font-bold" : "text-gray-300"}`}>{brief.opportunity.deadline}{brief.opportunity.days_remaining !== null ? ` (${brief.opportunity.days_remaining}d)` : ""}</p></div>
                                  </div>

                                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white/[0.02] border border-white/5 p-3 sm:p-4 rounded space-y-3 min-w-0">
                                    <h4 className="text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2"><Target size={10} className="text-[#0066ff] sm:size-3 shrink-0" /> Proposal Brief</h4>
                                    <div className="min-w-0"><p className="text-gray-500 text-[9px] sm:text-[10px] font-mono uppercase mb-1">Rationale</p><p className="text-gray-300 text-xs sm:text-sm break-words">{brief.proposal_brief.rationale}</p></div>
                                    <div className="min-w-0"><p className="text-gray-500 text-[9px] sm:text-[10px] font-mono uppercase mb-1">Strategy</p><p className="text-gray-300 text-xs sm:text-sm break-words">{brief.proposal_brief.pursuit_strategy}</p></div>
                                    <div className="min-w-0">
                                      <p className="text-gray-500 text-[9px] sm:text-[10px] font-mono uppercase mb-1.5">Capabilities</p>
                                      <div className="flex flex-wrap gap-1">
                                        {brief.proposal_brief.capability_alignment.map((cap: string, i: number) => (
                                          <motion.span key={i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} className="text-[8px] sm:text-[10px] font-mono px-2 py-0.5 bg-green-500/10 text-green-300 border border-green-500/20 rounded flex items-center gap-1 whitespace-nowrap">
                                            <Shield size={7} className="sm:size-2" /><span className="hidden sm:inline">{cap}</span><span className="sm:hidden">{cap?.substring(0, 8)}</span>
                                          </motion.span>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                      <div className="min-w-0"><p className="text-gray-500 text-[9px] sm:text-[10px] font-mono uppercase mb-1">Personnel</p><p className="text-gray-300 text-xs break-words">{brief.proposal_brief.key_personnel_needed}</p></div>
                                      <div className="min-w-0"><p className="text-gray-500 text-[9px] sm:text-[10px] font-mono uppercase mb-1">Effort</p><p className="text-gray-300 text-xs break-words">{brief.proposal_brief.estimated_level_of_effort}</p></div>
                                    </div>
                                  </motion.div>

                                  <div className="min-w-0">
                                    <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-2">Next Steps</h4>
                                    <div className="space-y-1.5">
                                      {brief.next_steps.map((step: string, i: number) => (
                                        <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.06 }} className="flex items-start gap-2 text-xs">
                                          <span className="text-[#0066ff] font-mono shrink-0 mt-0.5"><CheckCircle2 size={10} className="sm:size-3" /></span>
                                          <span className="text-gray-300 break-words">{step}</span>
                                        </motion.div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </>
              ) : (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="tech-card p-10 text-center">
                  <Target size={36} className="mx-auto mb-3 text-gray-600" />
                  <p className="text-gray-400 mb-1">No proposal briefs generated yet</p>
                  <p className="text-gray-500 text-sm mb-5">Generate a Daily Digest to scan SAM.gov and create bid/no-bid recommendation briefs for matched opportunities.</p>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => { handleTabSwitch("digest"); fetchDigest(); }} className="px-5 py-2.5 bg-[#00e5a0] text-black text-sm rounded hover:bg-[#00cc8a] transition-colors font-medium">
                    <Zap size={14} className="inline mr-2" /> Generate Daily Digest
                  </motion.button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ============================================================ */}
          {/* TAB: DAILY DIGEST */}
          {/* ============================================================ */}
          {activeTab === "digest" && (
            <motion.div key="digest" initial={{ opacity: 0, x: 20 * tabDirection }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 * tabDirection }} transition={{ duration: 0.25, ease: "easeOut" }} className="space-y-6">
              {digestLoading ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="tech-card p-10 text-center">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="inline-block mb-4">
                    <RefreshCw size={36} className="text-[#00e5a0]" />
                  </motion.div>
                  <p className="text-white text-lg font-medium mb-2">Generating Intelligence Digest</p>
                  <p className="text-gray-400 text-sm mb-6">Scanning SAM.gov, scoring opportunities, building proposal briefs...</p>

                  {/* Progress Bar */}
                  <div className="max-w-md mx-auto">
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div className="h-full bg-gradient-to-r from-[#0066ff] to-[#00e5a0] rounded-full" animate={{ width: `${digestProgress}%` }} transition={{ duration: 0.5, ease: "easeOut" }} />
                    </div>
                    <div className="flex justify-between mt-2 text-[10px] font-mono text-gray-500">
                      <span>Connecting</span>
                      <span>Scanning</span>
                      <span>Scoring</span>
                      <span>Briefs</span>
                      <span>Done</span>
                    </div>
                  </div>

                  {/* Progress Steps */}
                  <motion.div className="mt-6 space-y-2 max-w-sm mx-auto text-left">
                    {[
                      { label: "Connect to SAM.gov API", done: digestProgress >= 15 },
                      { label: "Scan 6 NAICS codes + SDVOSB set-asides", done: digestProgress >= 35 },
                      { label: "Score & rank opportunities", done: digestProgress >= 55 },
                      { label: "Generate proposal briefs", done: digestProgress >= 75 },
                      { label: "Build executive summary", done: digestProgress >= 90 },
                    ].map((step, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.15 }} className="flex items-center gap-2 text-xs">
                        {step.done ? (
                          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                            <CheckCircle2 size={14} className="text-[#00e5a0]" />
                          </motion.span>
                        ) : (
                          <span className="w-3.5 h-3.5 border border-white/20 rounded-full" />
                        )}
                        <span className={step.done ? "text-gray-300" : "text-gray-500"}>{step.label}</span>
                      </motion.div>
                    ))}
                  </motion.div>
                </motion.div>
              ) : digest ? (
                <>
                  {/* Executive Summary Header */}
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="tech-card p-4 sm:p-6 border-l-4" style={{ borderLeftColor: "#00e5a0" }}>
                    <h2 className="text-base sm:text-lg font-bold text-white mb-1 break-words" style={{ fontFamily: "Sora, sans-serif" }}>
                      SISG Daily Digest
                    </h2>
                    <p className="text-gray-400 text-xs sm:text-sm break-words">{digest.executive_summary.date} — Generated {new Date(digest.generatedAt).toLocaleTimeString()}</p>
                  </motion.div>

                  {/* Executive KPIs */}
                  <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 sm:gap-3">
                    {[
                      { label: "Tracked", value: digest.executive_summary.total_opportunities_tracked, color: "#fff" },
                      { label: "High", value: digest.executive_summary.high_value_opportunities, color: "#00e5a0" },
                      { label: "SDVOSB", value: digest.executive_summary.sdvosb_opportunities, color: "#8b5cf6" },
                      { label: "Urgent", value: digest.executive_summary.urgent_deadlines, color: "#ff4444" },
                      { label: "Briefs", value: digest.executive_summary.proposal_briefs_generated, color: "#0066ff" },
                      { label: "Strong", value: digest.executive_summary.strong_bid_recommendations, color: "#00e5a0" },
                      { label: "Actions", value: digest.executive_summary.action_items_count, color: "#ffb800" },
                    ].map((kpi, i) => (
                      <motion.div key={i} variants={staggerItem} whileHover={{ y: -2 }} className="tech-card p-3 sm:p-4">
                        <p className="text-[8px] sm:text-[9px] font-mono text-gray-600 uppercase tracking-widest break-words">{kpi.label}</p>
                        <p className="text-lg sm:text-xl font-bold mt-2"><AnimatedCounter value={kpi.value} color={kpi.color} /></p>
                      </motion.div>
                    ))}
                  </motion.div>

                  {/* Action Items */}
                  {digest.action_items.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="tech-card p-4 sm:p-5">
                      <h3 className="text-white font-bold text-xs sm:text-sm uppercase tracking-wider mb-4 flex items-center gap-2 break-words">
                        <Zap size={12} className="sm:size-3.5 shrink-0" style={{ color: "#ffb800" }} /> Actions ({digest.action_items.length})
                      </h3>
                      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-2">
                        {digest.action_items.map((item: any, i: number) => (
                          <motion.div key={i} variants={staggerItem} whileHover={{ x: 2 }} className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-white/[0.02] border border-white/5 rounded hover:border-white/10 transition-colors">
                            <span className={`text-[8px] sm:text-[10px] font-mono px-2 py-0.5 border rounded shrink-0 whitespace-nowrap ${item.priority === "URGENT" ? "border-red-500 text-red-400 bg-red-500/10" : item.priority === "HIGH" ? "border-orange-500 text-orange-400 bg-orange-500/10" : "border-blue-500 text-blue-400 bg-blue-500/10"}`}>
                              {item.priority === "URGENT" && <AlertTriangle size={8} className="inline mr-1 sm:size-2.5" />}
                              {item.priority?.substring(0, 3)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-gray-200 text-xs sm:text-sm break-words">{item.action}</p>
                              <div className="flex flex-col sm:flex-row flex-wrap gap-1 sm:gap-3 mt-1">
                                {item.deadline && <p className="text-gray-500 text-[9px] sm:text-[10px] font-mono break-words">D: {item.deadline?.substring(0, 10)}</p>}
                                {item.contact && <p className="text-gray-500 text-[9px] sm:text-[10px] font-mono truncate">C: {item.contact?.substring(0, 15)}</p>}
                                {item.solicitation && item.solicitation !== "N/A" && <p className="text-gray-500 text-[9px] sm:text-[10px] font-mono truncate">S: {item.solicitation?.substring(0, 12)}</p>}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    </motion.div>
                  )}

                  {/* Quick Links */}
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                    <motion.button whileHover={{ y: -2, scale: 1.01 }} onClick={() => handleTabSwitch("opportunities")} className="tech-card p-3 sm:p-4 text-left hover:border-[#0066ff]/30 transition-colors">
                      <Search size={14} className="text-[#0066ff] mb-2 sm:size-4" />
                      <p className="text-white text-xs sm:text-sm font-bold break-words">Browse Opportunities</p>
                      <p className="text-gray-500 text-xs mt-1">View {digest.executive_summary.total_opportunities_tracked}</p>
                    </motion.button>
                    <motion.button whileHover={{ y: -2, scale: 1.01 }} onClick={() => handleTabSwitch("proposals")} className="tech-card p-3 sm:p-4 text-left hover:border-[#00e5a0]/30 transition-colors">
                      <Target size={14} className="text-[#00e5a0] mb-2 sm:size-4" />
                      <p className="text-white text-xs sm:text-sm font-bold break-words">Proposal Briefs</p>
                      <p className="text-gray-500 text-xs mt-1">{digest.executive_summary.proposal_briefs_generated} briefs</p>
                    </motion.button>
                    <motion.button whileHover={{ y: -2, scale: 1.01 }} onClick={() => handleTabSwitch("pipeline")} className="tech-card p-3 sm:p-4 text-left hover:border-[#8b5cf6]/30 transition-colors">
                      <TrendingUp size={14} className="text-[#8b5cf6] mb-2 sm:size-4" />
                      <p className="text-white text-xs sm:text-sm font-bold break-words">Manage Pipeline</p>
                      <p className="text-gray-500 text-xs mt-1">{contracts.length} contracts</p>
                    </motion.button>
                  </motion.div>

                  {/* Agent Status */}
                  {digest.agent_status && (
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="tech-card p-4 sm:p-5">
                      <h3 className="text-white font-bold text-xs sm:text-sm uppercase tracking-wider mb-4">Agent Status</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                        {digest.agent_status.map((agent: any, i: number) => (
                          <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 + i * 0.04 }} className="bg-white/[0.02] border border-white/5 p-2 sm:p-3 rounded">
                            <p className="text-gray-400 text-[8px] sm:text-[10px] font-mono uppercase break-words">{agent.name?.substring(0, 12)}</p>
                            <p className={`text-xs sm:text-sm font-bold mt-1 ${agent.status === "deployed" ? "text-green-400" : agent.status === "error" ? "text-red-400" : "text-gray-500"}`}>
                              {agent.status === "deployed" ? "OK" : agent.status?.substring(0, 5)}
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </>
              ) : (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="tech-card p-10 text-center">
                  <Zap size={36} className="mx-auto mb-3 text-gray-600" />
                  <p className="text-gray-400 mb-1 text-lg">Daily Intelligence Digest</p>
                  <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
                    This will scan SAM.gov across your 6 NAICS codes and SDVOSB set-asides,
                    score every opportunity, generate proposal briefs, and build an executive action plan.
                  </p>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={fetchDigest} className="px-6 py-3 bg-[#00e5a0] text-black text-sm rounded hover:bg-[#00cc8a] transition-colors font-medium">
                    <Zap size={14} className="inline mr-2" /> Generate Today's Digest
                  </motion.button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ============================================================ */}
        {/* ADD CONTRACT MODAL */}
        {/* ============================================================ */}
        <AnimatePresence>
          {showModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 20 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} className="tech-card p-4 sm:p-6 w-full max-w-2xl sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start gap-3 mb-4 sm:mb-6">
                  <div className="flex-1">
                    <h2 className="text-lg sm:text-2xl font-bold text-white flex-1 break-words" style={{ fontFamily: "Sora, sans-serif" }}>
                      {selectedOppForBid ? "Generate Contract Bid from SAM.gov" : "Add Contract"}
                    </h2>
                    {selectedOppForBid && (
                      <p className="text-gray-400 text-xs sm:text-sm mt-1">Pre-filled from opportunity: {selectedOppForBid.solicitationNumber}</p>
                    )}
                  </div>
                  <motion.button whileHover={{ scale: 1.1, rotate: 90 }} onClick={() => { setShowModal(false); resetFormData(); }} className="text-gray-400 hover:text-white shrink-0">
                    <X size={20} className="sm:size-6" />
                  </motion.button>
                </div>

                {/* Section 1: Opportunity Details (read-only, if SAM.gov opportunity) */}
                {selectedOppForBid && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 sm:p-5 bg-white/5 border border-white/10 rounded space-y-3">
                    <p className="text-[9px] sm:text-[10px] font-mono text-gray-500 uppercase tracking-widest">Opportunity Details</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      {selectedOppForBid.solicitationNumber && (
                        <div className="bg-white/[0.02] p-3 rounded border border-white/5">
                          <p className="text-gray-600 font-mono text-[8px] sm:text-[9px] uppercase mb-1">Solicitation</p>
                          <p className="text-gray-300 font-medium break-all">{selectedOppForBid.solicitationNumber}</p>
                        </div>
                      )}
                      {formData.score && (
                        <div className="bg-white/[0.02] p-3 rounded border border-white/5">
                          <p className="text-gray-600 font-mono text-[8px] sm:text-[9px] uppercase mb-1">Match Score</p>
                          <p className="text-[#00e5a0] font-bold flex items-center gap-1">
                            <span className="text-[9px] sm:text-xs px-2 py-0.5 rounded border border-[#00e5a0]/40 bg-[#00e5a0]/10">{formData.score} — {getScoreLabel(formData.score)}</span>
                          </p>
                        </div>
                      )}
                      <div className="bg-white/[0.02] p-3 rounded border border-white/5">
                        <p className="text-gray-600 font-mono text-[8px] sm:text-[9px] uppercase mb-1">Agency</p>
                        <p className="text-gray-300 font-medium break-words">{selectedOppForBid.department || selectedOppForBid.organization || "N/A"}</p>
                      </div>
                      <div className="bg-white/[0.02] p-3 rounded border border-white/5">
                        <p className="text-gray-600 font-mono text-[8px] sm:text-[9px] uppercase mb-1">NAICS</p>
                        <p className="text-cyan-400 font-mono text-xs">{selectedOppForBid.naicsCode}</p>
                      </div>
                      {selectedOppForBid.setAside && (
                        <div className="bg-white/[0.02] p-3 rounded border border-white/5">
                          <p className="text-gray-600 font-mono text-[8px] sm:text-[9px] uppercase mb-1">Set-Aside</p>
                          <p className="text-purple-300 font-medium text-xs break-words">{selectedOppForBid.setAsideDescription || selectedOppForBid.setAside}</p>
                        </div>
                      )}
                      {selectedOppForBid.responseDeadline && (
                        <div className="bg-white/[0.02] p-3 rounded border border-white/5">
                          <p className="text-gray-600 font-mono text-[8px] sm:text-[9px] uppercase mb-1">Deadline</p>
                          <p className="text-gray-300 text-xs">{selectedOppForBid.responseDeadline.split('T')[0]}</p>
                        </div>
                      )}
                      {selectedOppForBid.pointOfContact && (
                        <div className="bg-white/[0.02] p-3 rounded border border-white/5">
                          <p className="text-gray-600 font-mono text-[8px] sm:text-[9px] uppercase mb-1">POC</p>
                          <p className="text-gray-300 text-xs truncate">{selectedOppForBid.pointOfContact.fullName || "N/A"}</p>
                        </div>
                      )}
                      {selectedOppForBid.uiLink && (
                        <div className="bg-white/[0.02] p-3 rounded border border-white/5">
                          <p className="text-gray-600 font-mono text-[8px] sm:text-[9px] uppercase mb-1">SAM.gov</p>
                          <a href={selectedOppForBid.uiLink} target="_blank" rel="noopener noreferrer" className="text-[#0066ff] text-xs hover:underline flex items-center gap-1">
                            <ExternalLink size={10} /> Link
                          </a>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Section 2: Contract Bid Details (editable) */}
                <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                  <p className="text-[9px] sm:text-[10px] font-mono text-gray-500 uppercase tracking-widest">Contract Bid Details</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div><label className="text-[9px] sm:text-[10px] font-mono text-gray-600 uppercase tracking-widest block mb-2">Title</label><input type="text" value={formData.title} onChange={(e) => handleInputChange("title", e.target.value)} className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 sm:py-2.5 outline-none text-xs sm:text-sm rounded focus:border-[#0066ff]/50 transition-colors" required /></div>
                    <div><label className="text-[9px] sm:text-[10px] font-mono text-gray-600 uppercase tracking-widest block mb-2">Client</label><input type="text" value={formData.client} onChange={(e) => handleInputChange("client", e.target.value)} className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 sm:py-2.5 outline-none text-xs sm:text-sm rounded focus:border-[#0066ff]/50 transition-colors" required /></div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div><label className="text-[9px] sm:text-[10px] font-mono text-gray-600 uppercase tracking-widest block mb-2">Value ($)</label><input type="number" value={formData.value} onChange={(e) => handleInputChange("value", e.target.value)} className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 sm:py-2.5 outline-none text-xs sm:text-sm rounded focus:border-[#0066ff]/50 transition-colors" required /></div>
                    <div><label className="text-[9px] sm:text-[10px] font-mono text-gray-600 uppercase tracking-widest block mb-2">Type</label><select value={formData.type} onChange={(e) => handleInputChange("type", e.target.value)} className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 sm:py-2.5 outline-none text-xs sm:text-sm rounded"><option value="assessment">Assessment</option><option value="modernization">Modernization</option><option value="security">Security</option><option value="intelligence">Intelligence</option><option value="systems">Systems</option></select></div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div><label className="text-[9px] sm:text-[10px] font-mono text-gray-600 uppercase tracking-widest block mb-2">Status</label><select value={formData.status} onChange={(e) => handleInputChange("status", e.target.value)} className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 sm:py-2.5 outline-none text-xs sm:text-sm rounded"><option value="bidding">Bidding</option><option value="review">Review</option><option value="active">Active</option><option value="completed">Completed</option></select></div>
                    <div />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div><label className="text-[9px] sm:text-[10px] font-mono text-gray-600 uppercase tracking-widest block mb-2">Start Date</label><input type="date" value={formData.startDate} onChange={(e) => handleInputChange("startDate", e.target.value)} className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 sm:py-2.5 outline-none text-xs sm:text-sm rounded focus:border-[#0066ff]/50 transition-colors" required /></div>
                    <div><label className="text-[9px] sm:text-[10px] font-mono text-gray-600 uppercase tracking-widest block mb-2">End Date</label><input type="date" value={formData.endDate} onChange={(e) => handleInputChange("endDate", e.target.value)} className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 sm:py-2.5 outline-none text-xs sm:text-sm rounded focus:border-[#0066ff]/50 transition-colors" required /></div>
                  </div>

                  {selectedOppForBid && (
                    <div className="space-y-3 border-t border-white/5 pt-4">
                      <p className="text-[9px] sm:text-[10px] font-mono text-gray-500 uppercase tracking-widest">SAM.gov Reference</p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div><label className="text-[9px] sm:text-[10px] font-mono text-gray-600 uppercase tracking-widest block mb-2">NAICS Code</label><input type="text" value={formData.naicsCode} onChange={(e) => handleInputChange("naicsCode", e.target.value)} className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 sm:py-2.5 outline-none text-xs sm:text-sm rounded focus:border-[#0066ff]/50 transition-colors" /></div>
                        <div><label className="text-[9px] sm:text-[10px] font-mono text-gray-600 uppercase tracking-widest block mb-2">Set-Aside Type</label><input type="text" value={formData.setAside} onChange={(e) => handleInputChange("setAside", e.target.value)} className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 sm:py-2.5 outline-none text-xs sm:text-sm rounded focus:border-[#0066ff]/50 transition-colors" /></div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div><label className="text-[9px] sm:text-[10px] font-mono text-gray-600 uppercase tracking-widest block mb-2">Department/Agency</label><input type="text" value={formData.agency} onChange={(e) => handleInputChange("agency", e.target.value)} className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 sm:py-2.5 outline-none text-xs sm:text-sm rounded focus:border-[#0066ff]/50 transition-colors" /></div>
                        <div><label className="text-[9px] sm:text-[10px] font-mono text-gray-600 uppercase tracking-widest block mb-2">Place of Performance</label><input type="text" value={formData.placeOfPerformance} onChange={(e) => handleInputChange("placeOfPerformance", e.target.value)} className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 sm:py-2.5 outline-none text-xs sm:text-sm rounded focus:border-[#0066ff]/50 transition-colors" /></div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div><label className="text-[9px] sm:text-[10px] font-mono text-gray-600 uppercase tracking-widest block mb-2">Contracting Officer</label><input type="text" value={formData.contractingOfficer} onChange={(e) => handleInputChange("contractingOfficer", e.target.value)} className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 sm:py-2.5 outline-none text-xs sm:text-sm rounded focus:border-[#0066ff]/50 transition-colors" /></div>
                        <div><label className="text-[9px] sm:text-[10px] font-mono text-gray-600 uppercase tracking-widest block mb-2">Contracting Officer Email</label><input type="email" value={formData.contractingOfficerEmail} onChange={(e) => handleInputChange("contractingOfficerEmail", e.target.value)} className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 sm:py-2.5 outline-none text-xs sm:text-sm rounded focus:border-[#0066ff]/50 transition-colors" /></div>
                      </div>
                    </div>
                  )}

                  {selectedOppForBid && formData.bidRecommendation && (
                    <div className="space-y-3 border-t border-white/5 pt-4">
                      <p className="text-[9px] sm:text-[10px] font-mono text-gray-500 uppercase tracking-widest">Proposal Brief</p>

                      {formData.bidRecommendation && (
                        <div className="bg-green-500/5 border border-green-500/20 p-3 rounded">
                          <p className="text-gray-600 font-mono text-[9px] uppercase tracking-widest mb-1 flex items-center gap-1"><Award size={12} /> Bid Recommendation</p>
                          <p className="text-green-400 font-medium text-xs">{formData.bidRecommendation}</p>
                        </div>
                      )}

                      {formData.pursuitStrategy && (
                        <div><label className="text-[9px] sm:text-[10px] font-mono text-gray-600 uppercase tracking-widest block mb-2">Pursuit Strategy</label><textarea value={formData.pursuitStrategy} onChange={(e) => handleInputChange("pursuitStrategy", e.target.value)} className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 sm:py-2.5 outline-none text-xs sm:text-sm rounded focus:border-[#0066ff]/50 transition-colors" rows={2} /></div>
                      )}

                      {formData.capabilityAlignment && formData.capabilityAlignment.length > 0 && (
                        <div>
                          <p className="text-gray-600 font-mono text-[9px] sm:text-[10px] uppercase tracking-widest mb-2">Capability Alignment</p>
                          <div className="flex flex-wrap gap-1">
                            {formData.capabilityAlignment.map((cap: string, i: number) => (
                              <span key={i} className="text-[8px] sm:text-[9px] font-mono px-2 py-0.5 bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded">{cap}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {formData.keyPersonnel && (
                        <div><label className="text-[9px] sm:text-[10px] font-mono text-gray-600 uppercase tracking-widest block mb-2">Key Personnel Needed</label><textarea value={formData.keyPersonnel} onChange={(e) => handleInputChange("keyPersonnel", e.target.value)} className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 sm:py-2.5 outline-none text-xs sm:text-sm rounded focus:border-[#0066ff]/50 transition-colors" rows={2} /></div>
                      )}
                    </div>
                  )}

                  <div><label className="text-[9px] sm:text-[10px] font-mono text-gray-600 uppercase tracking-widest block mb-2">Description</label><textarea value={formData.description} onChange={(e) => handleInputChange("description", e.target.value)} className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 sm:py-2.5 outline-none text-xs sm:text-sm rounded focus:border-[#0066ff]/50 transition-colors" rows={3} /></div>

                  <div className="flex gap-2 sm:gap-3 justify-end pt-4 border-t border-white/5">
                    <motion.button whileHover={{ scale: 1.03 }} type="button" onClick={() => { setShowModal(false); resetFormData(); }} className="px-3 sm:px-4 py-2 sm:py-2.5 bg-white/5 text-gray-300 hover:text-white transition-colors rounded text-xs sm:text-sm">Cancel</motion.button>
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} type="submit" className="px-3 sm:px-4 py-2 sm:py-2.5 bg-[#0066ff] text-white hover:bg-[#0052cc] transition-colors rounded text-xs sm:text-sm whitespace-nowrap">Create Bid</motion.button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
