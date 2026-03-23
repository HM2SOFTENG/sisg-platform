"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Plus,
  TrendingUp,
  Target,
  Zap,
  ChevronRight,
  Calendar,
} from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  type: "event" | "digital" | "content";
  status: "active" | "planning" | "completed" | "paused";
  budget: number;
  spent: number;
  leads: number;
  conversions: number;
  startDate: string;
  endDate: string;
}

interface KPI {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

export default function MarketingDashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "digital" as const,
    status: "planning" as const,
    budget: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("sisg_admin_token");
      const response = await fetch("/api/admin/marketing", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCampaigns(data);
        calculateKPIs(data);
      }
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateKPIs = (campaignList: Campaign[]) => {
    const activeCampaigns = campaignList.filter(
      (c) => c.status === "active"
    ).length;
    const totalBudget = campaignList.reduce((sum, c) => sum + c.budget, 0);
    const totalLeads = campaignList.reduce((sum, c) => sum + c.leads, 0);

    setKpis([
      {
        label: "Total Campaigns",
        value: campaignList.length,
        icon: <Target className="w-5 h-5" />,
        color: "from-cyan-500 to-blue-500",
      },
      {
        label: "Active",
        value: activeCampaigns,
        icon: <Zap className="w-5 h-5" />,
        color: "from-emerald-500 to-cyan-500",
      },
      {
        label: "Total Budget",
        value: `$${(totalBudget / 1000).toFixed(0)}K`,
        icon: <TrendingUp className="w-5 h-5" />,
        color: "from-orange-500 to-red-500",
      },
      {
        label: "Total Leads",
        value: totalLeads,
        icon: <Target className="w-5 h-5" />,
        color: "from-purple-500 to-emerald-500",
      },
    ]);
  };

  const handleAddCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("sisg_admin_token");
      const response = await fetch("/api/admin/marketing", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          budget: parseFloat(formData.budget),
        }),
      });

      if (response.ok) {
        toast.success("Campaign created successfully");
        fetchCampaigns();
        setShowModal(false);
        setFormData({
          name: "",
          type: "digital",
          status: "planning",
          budget: "",
          startDate: "",
          endDate: "",
        });
      } else {
        toast.error("Failed to create campaign");
      }
    } catch (error) {
      console.error("Error creating campaign:", error);
      toast.error("Error creating campaign");
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "event":
        return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      case "digital":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "content":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
      default:
        return "bg-gray-500/10 text-gray-400";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "planning":
        return "bg-orange-500/10 text-orange-400 border-orange-500/30";
      case "completed":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "paused":
        return "bg-red-500/10 text-red-400 border-red-500/30";
      default:
        return "bg-gray-500/10 text-gray-400";
    }
  };

  const calculateROI = (spent: number, conversions: number) => {
    if (spent === 0) return 0;
    return Math.round((conversions / spent) * 100);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
        >
          <div>
            <h1
              className="text-xl sm:text-3xl font-bold text-white"
              style={{ fontFamily: "Sora, sans-serif" }}
            >
              Marketing Campaigns
            </h1>
            <p className="text-gray-400 mt-2">Manage and track campaign performance</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowModal(true)}
            className="w-full sm:w-auto flex items-center justify-center sm:justify-start gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg text-white font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition"
          >
            <Plus className="w-5 h-5" />
            Add Campaign
          </motion.button>
        </motion.div>

        {/* KPI Cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
        >
          {kpis.map((kpi, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="tech-card p-3 sm:p-5 border border-gray-700"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <p className="text-[8px] sm:text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                    {kpi.label}
                  </p>
                  <p className="text-lg sm:text-2xl font-bold text-white mt-2">{kpi.value}</p>
                </div>
                <div className={`bg-gradient-to-br ${kpi.color} p-3 rounded-lg text-white`}>
                  {kpi.icon}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Campaigns Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          {loading ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-400">Loading campaigns...</p>
            </div>
          ) : campaigns.length > 0 ? (
            campaigns.map((campaign, index) => (
              <motion.div
                key={campaign.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="tech-card p-5 border border-gray-700 hover:border-blue-500/50 transition cursor-pointer group"
              >
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white">
                        {campaign.name}
                      </h3>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-blue-400 transition" />
                  </div>

                  {/* Badges */}
                  <div className="flex gap-2">
                    <span className={`text-xs px-2 py-1 rounded border ${getTypeColor(campaign.type)}`}>
                      {campaign.type}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(campaign.status)}`}>
                      {campaign.status}
                    </span>
                  </div>

                  {/* Budget Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                        Budget Spent
                      </p>
                      <p className="text-sm font-semibold text-emerald-400">
                        {((campaign.spent / campaign.budget) * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(campaign.spent / campaign.budget) * 100}%` }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      ${(campaign.spent / 1000).toFixed(0)}K of $
                      {(campaign.budget / 1000).toFixed(0)}K
                    </p>
                  </div>

                  {/* Performance Metrics */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-700">
                    <div>
                      <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                        Leads
                      </p>
                      <p className="text-lg font-bold text-blue-400 mt-1">
                        {campaign.leads}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                        Conversions
                      </p>
                      <p className="text-lg font-bold text-emerald-400 mt-1">
                        {campaign.conversions}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                        ROI
                      </p>
                      <p className="text-lg font-bold text-cyan-400 mt-1">
                        {calculateROI(campaign.spent, campaign.conversions)}%
                      </p>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="flex items-center gap-2 text-xs text-gray-500 pt-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {new Date(campaign.startDate).toLocaleDateString()} -{" "}
                      {new Date(campaign.endDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-400">No campaigns found</p>
            </div>
          )}
        </motion.div>

        {/* Add Campaign Modal */}
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="tech-card p-4 sm:p-6 border border-gray-700 w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
              <h2
                className="text-lg sm:text-xl font-bold text-white mb-4"
                style={{ fontFamily: "Sora, sans-serif" }}
              >
                Add New Campaign
              </h2>
              <form onSubmit={handleAddCampaign} className="space-y-4">
                <div>
                  <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                    Campaign Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                      Type
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({ ...formData, type: e.target.value as any })
                      }
                      className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="event">Event</option>
                      <option value="digital">Digital</option>
                      <option value="content">Content</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value as any })
                      }
                      className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="planning">Planning</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="paused">Paused</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                    Budget ($)
                  </label>
                  <input
                    type="number"
                    value={formData.budget}
                    onChange={(e) =>
                      setFormData({ ...formData, budget: e.target.value })
                    }
                    className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) =>
                        setFormData({ ...formData, startDate: e.target.value })
                      }
                      className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) =>
                        setFormData({ ...formData, endDate: e.target.value })
                      }
                      className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-700 rounded text-gray-300 hover:bg-gray-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 rounded text-white font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition"
                  >
                    Create
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
