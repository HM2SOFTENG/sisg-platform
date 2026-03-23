"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart as PieChartIcon,
} from "lucide-react";

interface FinancialData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit?: number;
  profitMargin?: number;
  monthlyRevenue?: { month: string; revenue: number }[];
  contractsByStatus?: Record<string, number>;
}

interface KPI {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}

export default function Financials() {
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("sisg_admin_token");
      const response = await fetch("/api/admin/financials", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFinancialData(data);
        calculateKPIs(data);
      } else {
        toast.error("Failed to load financial data");
      }
    } catch (error) {
      console.error("Error fetching financials:", error);
      toast.error("Failed to load financial data");
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) =>
    n >= 1_000_000
      ? `$${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
      ? `$${(n / 1_000).toFixed(0)}K`
      : `$${n.toLocaleString()}`;

  const calculateKPIs = (data: FinancialData) => {
    const netProfit = data.netProfit ?? data.totalRevenue - data.totalExpenses;
    const margin =
      data.profitMargin != null
        ? data.profitMargin
        : data.totalRevenue > 0
        ? ((netProfit / data.totalRevenue) * 100)
        : 0;

    setKpis([
      {
        label: "Total Revenue",
        value: fmt(data.totalRevenue),
        icon: <DollarSign className="w-5 h-5" />,
        color: "from-emerald-500 to-cyan-500",
      },
      {
        label: "Total Expenses",
        value: fmt(data.totalExpenses),
        icon: <TrendingDown className="w-5 h-5" />,
        color: "from-orange-500 to-red-500",
      },
      {
        label: "Net Profit",
        value: fmt(netProfit),
        icon: <TrendingUp className="w-5 h-5" />,
        color: "from-purple-500 to-emerald-500",
      },
      {
        label: "Profit Margin",
        value: `${margin.toFixed(1)}%`,
        icon: <PieChartIcon className="w-5 h-5" />,
        color: "from-blue-500 to-cyan-500",
      },
    ]);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="tech-card p-2 border border-gray-700">
          <p className="text-xs text-gray-300">
            {payload[0].payload.month || payload[0].payload.name}
          </p>
          <p className="text-sm font-semibold text-cyan-400">
            {fmt(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  const monthlyRevenue = financialData?.monthlyRevenue ?? [];
  const contractsByStatus = financialData?.contractsByStatus ?? {};
  const contractStatusData = Object.entries(contractsByStatus).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1
            className="text-xl sm:text-3xl font-bold text-white"
            style={{ fontFamily: "Sora, sans-serif" }}
          >
            Financial Dashboard
          </h1>
          <p className="text-gray-400 mt-2">Revenue, expenses, and profitability</p>
        </motion.div>

        {loading && (
          <div className="flex items-center justify-center h-48 text-gray-500 font-mono text-xs">
            Loading financial data...
          </div>
        )}

        {!loading && !financialData && (
          <div className="flex items-center justify-center h-48 text-gray-600 font-mono text-xs">
            No financial data available.
          </div>
        )}

        {!loading && financialData && (
          <>
            {/* KPI Cards */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ staggerChildren: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-4 gap-4"
            >
              {kpis.map((kpi, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="tech-card p-5 border border-gray-700"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                        {kpi.label}
                      </p>
                      <p className="text-2xl font-bold text-white mt-2">{kpi.value}</p>
                    </div>
                    <div className={`bg-gradient-to-br ${kpi.color} p-3 rounded-lg text-white`}>
                      {kpi.icon}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Charts Row */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-4"
            >
              {/* Revenue Trend */}
              <div className="tech-card p-5 border border-gray-700">
                <h2
                  className="text-lg font-bold text-white mb-4"
                  style={{ fontFamily: "Sora, sans-serif" }}
                >
                  Revenue Trend
                </h2>
                {monthlyRevenue.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={monthlyRevenue}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#0066ff" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="month" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#00d4ff"
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-gray-600 font-mono text-xs">
                    No revenue data available.
                  </div>
                )}
              </div>

              {/* Contract Status */}
              <div className="tech-card p-5 border border-gray-700">
                <h2
                  className="text-lg font-bold text-white mb-4"
                  style={{ fontFamily: "Sora, sans-serif" }}
                >
                  Contracts by Status
                </h2>
                {contractStatusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={contractStatusData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis type="number" stroke="#9ca3af" allowDecimals={false} />
                      <YAxis dataKey="name" type="category" stroke="#9ca3af" width={100} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" fill="#00d4ff" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-gray-600 font-mono text-xs">
                    No contract data available.
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
