"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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
  netProfit: number;
  profitMargin: number;
}

interface KPI {
  label: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  color: string;
  isPositive: boolean;
}

const mockRevenueData = [
  { month: "Oct", revenue: 1200000 },
  { month: "Nov", revenue: 1450000 },
  { month: "Dec", revenue: 1850000 },
  { month: "Jan", revenue: 2100000 },
  { month: "Feb", revenue: 2750000 },
  { month: "Mar", revenue: 3200000 },
];

const mockServiceLineData = [
  { name: "Cybersecurity", value: 1200000 },
  { name: "Cloud", value: 950000 },
  { name: "Software", value: 780000 },
  { name: "Consulting", value: 620000 },
];

const mockExpenseData = [
  { category: "Personnel", amount: 1200000, percentage: 45 },
  { category: "Infrastructure", amount: 480000, percentage: 18 },
  { category: "Marketing", amount: 320000, percentage: 12 },
  { category: "Operations", amount: 240000, percentage: 9 },
  { category: "R&D", amount: 320000, percentage: 12 },
];

const mockContractData = [
  {
    id: 1,
    name: "Acme Corp Security",
    value: 150000,
    status: "active",
    endDate: "2026-12-31",
  },
  {
    id: 2,
    name: "TechFlow Cloud Migration",
    value: 250000,
    status: "active",
    endDate: "2026-09-30",
  },
  {
    id: 3,
    name: "DataSync Consulting",
    value: 75000,
    status: "completed",
    endDate: "2026-03-15",
  },
  {
    id: 4,
    name: "Global Industries Platform",
    value: 320000,
    status: "active",
    endDate: "2027-06-30",
  },
];

const COLORS = ["#0066ff", "#00d4ff", "#00e5a0", "#ffb800", "#ff3b3b"];

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
        // Use mock data if API fails
        const mockData = {
          totalRevenue: 10550000,
          totalExpenses: 2660000,
          netProfit: 7890000,
          profitMargin: 74.8,
        };
        setFinancialData(mockData);
        calculateKPIs(mockData);
      }
    } catch (error) {
      console.error("Error fetching financials:", error);
      const mockData = {
        totalRevenue: 10550000,
        totalExpenses: 2660000,
        netProfit: 7890000,
        profitMargin: 74.8,
      };
      setFinancialData(mockData);
      calculateKPIs(mockData);
    } finally {
      setLoading(false);
    }
  };

  const calculateKPIs = (data: FinancialData) => {
    setKpis([
      {
        label: "Total Revenue",
        value: `$${(data.totalRevenue / 1000000).toFixed(1)}M`,
        change: "+12.5%",
        icon: <DollarSign className="w-5 h-5" />,
        color: "from-emerald-500 to-cyan-500",
        isPositive: true,
      },
      {
        label: "Total Expenses",
        value: `$${(data.totalExpenses / 1000000).toFixed(1)}M`,
        change: "-3.2%",
        icon: <TrendingDown className="w-5 h-5" />,
        color: "from-orange-500 to-red-500",
        isPositive: true,
      },
      {
        label: "Net Profit",
        value: `$${(data.netProfit / 1000000).toFixed(1)}M`,
        change: "+18.3%",
        icon: <TrendingUp className="w-5 h-5" />,
        color: "from-purple-500 to-emerald-500",
        isPositive: true,
      },
      {
        label: "Profit Margin",
        value: `${data.profitMargin.toFixed(1)}%`,
        change: "+2.1%",
        icon: <PieChartIcon className="w-5 h-5" />,
        color: "from-blue-500 to-cyan-500",
        isPositive: true,
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
            ${(payload[0].value / 1000000).toFixed(2)}M
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1
            className="text-3xl font-bold text-white"
            style={{ fontFamily: "Sora, sans-serif" }}
          >
            Financial Dashboard
          </h1>
          <p className="text-gray-400 mt-2">Revenue, expenses, and profitability</p>
        </motion.div>

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
                  <p
                    className={`text-xs mt-2 ${
                      kpi.isPositive ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {kpi.change}
                  </p>
                </div>
                <div className={`bg-gradient-to-br ${kpi.color} p-3 rounded-lg text-white`}>
                  {kpi.icon}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Charts Row 1 */}
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
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={mockRevenueData}>
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
          </div>

          {/* Service Line Revenue */}
          <div className="tech-card p-5 border border-gray-700">
            <h2
              className="text-lg font-bold text-white mb-4"
              style={{ fontFamily: "Sora, sans-serif" }}
            >
              Revenue by Service Line
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mockServiceLineData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9ca3af" />
                <YAxis dataKey="name" type="category" stroke="#9ca3af" width={100} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#00d4ff" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Charts Row 2 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          {/* Expense Breakdown */}
          <div className="tech-card p-5 border border-gray-700">
            <h2
              className="text-lg font-bold text-white mb-4"
              style={{ fontFamily: "Sora, sans-serif" }}
            >
              Expense Breakdown
            </h2>
            <div className="space-y-4">
              {mockExpenseData.map((expense, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-300">{expense.category}</p>
                    <p className="text-sm font-semibold text-cyan-400">
                      ${(expense.amount / 1000000).toFixed(2)}M
                    </p>
                  </div>
                  <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${expense.percentage}%` }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                      className="h-full bg-gradient-to-r from-orange-500 to-red-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500">{expense.percentage}%</p>
                </div>
              ))}
            </div>
          </div>

          {/* Budget Summary */}
          <div className="tech-card p-5 border border-gray-700 space-y-4">
            <h2
              className="text-lg font-bold text-white"
              style={{ fontFamily: "Sora, sans-serif" }}
            >
              Budget Summary
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                    Actual Spend
                  </p>
                  <p className="text-sm font-semibold text-emerald-400">73.8%</p>
                </div>
                <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "73.8%" }}
                    transition={{ duration: 0.5 }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700">
                <div>
                  <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                    Budget
                  </p>
                  <p className="text-xl font-bold text-white mt-1">$3.6M</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                    Used
                  </p>
                  <p className="text-xl font-bold text-emerald-400 mt-1">$2.66M</p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-700">
                <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-2">
                  Available
                </p>
                <p className="text-xl font-bold text-cyan-400">$940K</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Contract Revenue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="tech-card p-5 border border-gray-700"
        >
          <h2
            className="text-lg font-bold text-white mb-4"
            style={{ fontFamily: "Sora, sans-serif" }}
          >
            Contract Revenue
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left text-[10px] font-mono text-gray-600 uppercase tracking-widest py-3">
                    Contract Name
                  </th>
                  <th className="text-right text-[10px] font-mono text-gray-600 uppercase tracking-widest py-3">
                    Value
                  </th>
                  <th className="text-center text-[10px] font-mono text-gray-600 uppercase tracking-widest py-3">
                    Status
                  </th>
                  <th className="text-right text-[10px] font-mono text-gray-600 uppercase tracking-widest py-3">
                    End Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {mockContractData.map((contract) => (
                  <tr
                    key={contract.id}
                    className="border-b border-gray-800 hover:bg-gray-800/30 transition"
                  >
                    <td className="py-3 text-white">{contract.name}</td>
                    <td className="py-3 text-right font-semibold text-cyan-400">
                      ${(contract.value / 1000).toFixed(0)}K
                    </td>
                    <td className="py-3 text-center">
                      <span
                        className={`text-xs px-2 py-1 rounded border ${
                          contract.status === "active"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                        }`}
                      >
                        {contract.status}
                      </span>
                    </td>
                    <td className="py-3 text-right text-gray-400">
                      {new Date(contract.endDate).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
