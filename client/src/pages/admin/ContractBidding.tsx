"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

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

export default function ContractBidding() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "bidding" | "review" | "active" | "completed">("all");
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    client: "",
    value: "",
    type: "assessment" as const,
    status: "bidding" as const,
    startDate: "",
    endDate: "",
    description: "",
  });

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      const token = localStorage.getItem("sisg_admin_token");
      const response = await fetch("/api/admin/contracts", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
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

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("sisg_admin_token");
      const response = await fetch("/api/admin/contracts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          value: parseFloat(formData.value),
        }),
      });
      if (response.ok) {
        const newContract = await response.json();
        setContracts((prev) => [...prev, newContract]);
        setShowModal(false);
        setFormData({
          title: "",
          client: "",
          value: "",
          type: "assessment",
          status: "bidding",
          startDate: "",
          endDate: "",
          description: "",
        });
        toast.success("Contract bid created successfully");
      } else {
        toast.error("Failed to create contract bid");
      }
    } catch (error) {
      console.error("Failed to create contract:", error);
      toast.error("Failed to create contract bid");
    }
  };

  const filteredContracts = contracts.filter((contract) => {
    if (statusFilter === "all") return true;
    return contract.status === statusFilter;
  });

  const stats = {
    totalValue: contracts.reduce((sum, c) => sum + c.value, 0),
    activeCount: contracts.filter((c) => c.status === "active").length,
    biddingCount: contracts.filter((c) => c.status === "bidding").length,
    winRate: contracts.length > 0
      ? Math.round(
          (contracts.filter((c) => c.status === "completed").length / contracts.length) * 100
        )
      : 0,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "bidding":
        return "#ffb800";
      case "review":
        return "#8b5cf6";
      case "active":
        return "#00e5a0";
      case "completed":
        return "#0066ff";
      default:
        return "#666";
    }
  };

  const getTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
                Contract <span className="gradient-text">Bidding Pipeline</span>
              </h1>
              <p className="text-gray-400 mt-2">Manage contracts and bid opportunities</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#0066ff] text-white hover:bg-[#0052cc] transition-colors w-full sm:w-auto"
            >
              <Plus size={18} /> Add Contract
            </button>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4"
        >
          <div className="tech-card p-5">
            <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Total Pipeline Value</p>
            <p className="text-2xl font-bold text-white mt-3">{formatValue(stats.totalValue)}</p>
          </div>
          <div className="tech-card p-5">
            <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Active Contracts</p>
            <p className="text-2xl font-bold" style={{ color: "#00e5a0" }}>
              {stats.activeCount}
            </p>
          </div>
          <div className="tech-card p-5">
            <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Bidding</p>
            <p className="text-2xl font-bold" style={{ color: "#ffb800" }}>
              {stats.biddingCount}
            </p>
          </div>
          <div className="tech-card p-5">
            <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Win Rate</p>
            <p className="text-2xl font-bold" style={{ color: "#0066ff" }}>
              {stats.winRate}%
            </p>
          </div>
        </motion.div>

        {/* Status Filter Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-2 overflow-x-auto"
        >
          {(["all", "bidding", "review", "active", "completed"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 text-sm font-mono uppercase tracking-widest whitespace-nowrap transition-colors ${
                statusFilter === status
                  ? "bg-[#0066ff] text-white"
                  : "bg-white/5 text-gray-400 hover:text-white"
              }`}
            >
              {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </motion.div>

        {/* Contracts Grid */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {loading ? (
            <p className="text-gray-400">Loading contracts...</p>
          ) : filteredContracts.length === 0 ? (
            <p className="text-gray-400">No contracts found</p>
          ) : (
            filteredContracts.map((contract) => (
              <div key={contract.id} className="tech-card p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-white font-bold text-lg" style={{ fontFamily: "Sora, sans-serif" }}>
                      {contract.title}
                    </h3>
                    <p className="text-gray-400 text-sm mt-1">{contract.client}</p>
                  </div>
                  <span
                    className="text-[10px] font-mono px-2 py-1 border"
                    style={{ borderColor: getStatusColor(contract.status), color: getStatusColor(contract.status) }}
                  >
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
                    <span
                      className="text-[10px] font-mono px-2 py-1 border border-white/20 text-gray-300 inline-block mt-1"
                    >
                      {getTypeLabel(contract.type)}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-gray-400">
                  <p>
                    {new Date(contract.startDate).toLocaleDateString()} -{" "}
                    {new Date(contract.endDate).toLocaleDateString()}
                  </p>
                </div>

                {contract.description && (
                  <p className="text-sm text-gray-300 leading-relaxed">{contract.description}</p>
                )}
              </div>
            ))
          )}
        </motion.div>

        {/* Add Contract Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="tech-card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
                  Add New Contract
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest block mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleInputChange("title", e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest block mb-2">
                      Client
                    </label>
                    <input
                      type="text"
                      value={formData.client}
                      onChange={(e) => handleInputChange("client", e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest block mb-2">
                      Contract Value ($)
                    </label>
                    <input
                      type="number"
                      value={formData.value}
                      onChange={(e) => handleInputChange("value", e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest block mb-2">
                      Type
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) =>
                        handleInputChange("type", e.target.value)
                      }
                      className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 outline-none"
                    >
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
                    <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest block mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        handleInputChange("status", e.target.value)
                      }
                      className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 outline-none"
                    >
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
                    <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest block mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => handleInputChange("startDate", e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest block mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => handleInputChange("endDate", e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest block mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 outline-none"
                    rows={4}
                  />
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-white/5 text-gray-300 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#0066ff] text-white hover:bg-[#0052cc] transition-colors"
                  >
                    Create Contract
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
