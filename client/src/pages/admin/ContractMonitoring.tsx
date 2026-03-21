"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Contract {
  id: string;
  title: string;
  client: string;
  value: number;
  status: "bidding" | "review" | "active" | "completed";
  startDate: string;
  endDate: string;
  completionPercent?: number;
}

export default function ContractMonitoring() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnlyActive, setShowOnlyActive] = useState(true);

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
        const enrichedData = data.map((contract: Contract) => {
          const today = new Date();
          const start = new Date(contract.startDate);
          const end = new Date(contract.endDate);
          const total = end.getTime() - start.getTime();
          const elapsed = today.getTime() - start.getTime();
          const completion = Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
          return { ...contract, completionPercent: completion };
        });
        setContracts(enrichedData);
      }
    } catch (error) {
      console.error("Failed to fetch contracts:", error);
    } finally {
      setLoading(false);
    }
  };

  const displayedContracts = showOnlyActive
    ? contracts.filter((c) => c.status === "active")
    : contracts;

  const stats = {
    totalActiveValue: displayedContracts
      .filter((c) => c.status === "active")
      .reduce((sum, c) => sum + c.value, 0),
    contractsInProgress: displayedContracts.filter((c) => c.status === "active").length,
    avgCompletion:
      displayedContracts.length > 0
        ? Math.round(
            displayedContracts.reduce((sum, c) => sum + (c.completionPercent || 0), 0) /
              displayedContracts.length
          )
        : 0,
    atRisk: displayedContracts.filter((c) => (c.completionPercent || 0) < 30).length,
  };

  const getStatusIndicatorColor = (completion: number) => {
    if (completion > 60) return "#00e5a0";
    if (completion >= 30) return "#ffb800";
    return "#ff3b3b";
  };

  const chartData = displayedContracts.map((contract) => ({
    name: contract.title.substring(0, 15),
    value: contract.value,
  }));

  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value}`;
  };

  const daysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    const diff = end.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    return days;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
            Contract <span className="gradient-text">Monitoring</span>
          </h1>
          <p className="text-gray-400 mt-2">Track active contracts and project progress</p>
        </motion.div>

        {/* KPI Cards */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-4 gap-4"
        >
          <div className="tech-card p-5">
            <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Total Active Value</p>
            <p className="text-2xl font-bold text-white mt-3">{formatValue(stats.totalActiveValue)}</p>
          </div>
          <div className="tech-card p-5">
            <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">In Progress</p>
            <p className="text-2xl font-bold" style={{ color: "#0066ff" }}>
              {stats.contractsInProgress}
            </p>
          </div>
          <div className="tech-card p-5">
            <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Avg Completion %</p>
            <p className="text-2xl font-bold" style={{ color: "#00e5a0" }}>
              {stats.avgCompletion}%
            </p>
          </div>
          <div className="tech-card p-5">
            <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">At Risk</p>
            <p className="text-2xl font-bold" style={{ color: "#ff3b3b" }}>
              {stats.atRisk}
            </p>
          </div>
        </motion.div>

        {/* Filter Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-2"
        >
          <button
            onClick={() => setShowOnlyActive(true)}
            className={`px-4 py-2 text-sm font-mono uppercase tracking-widest transition-colors ${
              showOnlyActive
                ? "bg-[#0066ff] text-white"
                : "bg-white/5 text-gray-400 hover:text-white"
            }`}
          >
            Active Only
          </button>
          <button
            onClick={() => setShowOnlyActive(false)}
            className={`px-4 py-2 text-sm font-mono uppercase tracking-widest transition-colors ${
              !showOnlyActive
                ? "bg-[#0066ff] text-white"
                : "bg-white/5 text-gray-400 hover:text-white"
            }`}
          >
            All Contracts
          </button>
        </motion.div>

        {/* Monitoring Cards */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 gap-4"
        >
          {loading ? (
            <p className="text-gray-400">Loading contracts...</p>
          ) : displayedContracts.length === 0 ? (
            <p className="text-gray-400">No contracts to display</p>
          ) : (
            displayedContracts.map((contract) => {
              const completion = contract.completionPercent || 0;
              return (
                <div key={contract.id} className="tech-card p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-white font-bold text-lg" style={{ fontFamily: "Sora, sans-serif" }}>
                        {contract.title}
                      </h3>
                      <p className="text-gray-400 text-sm mt-1">{contract.client}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Contract Value</p>
                      <p className="text-white font-bold text-lg">{formatValue(contract.value)}</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Progress</p>
                      <p className="text-[10px] font-mono text-gray-400">{completion}%</p>
                    </div>
                    <div className="h-2 bg-white/5 overflow-hidden">
                      <div
                        className="h-full"
                        style={{
                          width: `${completion}%`,
                          background: "linear-gradient(to right, #0066ff, #00d4ff)",
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                  </div>

                  {/* Status and Dates */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Status</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: getStatusIndicatorColor(completion) }}
                        />
                        <span className="text-sm text-gray-300">
                          {completion > 60 ? "On Track" : completion >= 30 ? "At Risk" : "Critical"}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Start Date</p>
                      <p className="text-sm text-gray-300 mt-1">
                        {new Date(contract.startDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Days Remaining</p>
                      <p className="text-sm text-gray-300 mt-1">{daysRemaining(contract.endDate)} days</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </motion.div>

        {/* Chart */}
        {chartData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="tech-card p-5"
          >
            <h3 className="text-white font-bold text-lg mb-4" style={{ fontFamily: "Sora, sans-serif" }}>
              Contract Values
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="name" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(7, 7, 7, 0.9)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: 0,
                  }}
                  formatter={(value) => formatValue(value as number)}
                />
                <Bar dataKey="value" fill="#0066ff" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
