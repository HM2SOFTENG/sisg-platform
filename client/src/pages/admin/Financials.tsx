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

interface RevenueEntry { month: string; revenue: number }
interface ServiceLineEntry { name: string; value: number }
interface ExpenseEntry { category: string; amount: number; percentage: number }
interface ContractEntry { id: number; name: string; value: number; status: string; endDate: string }

const COLORS = ["#0066ff", "#00d4ff", "#00e5a0", "#ffb800", "#ff3b3b"];

export default function Financials() {
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<RevenueEntry[]>([]);
  const [serviceLineData, setServiceLineData] = useState<ServiceLineEntry[]>([]);
  const [expenseData, setExpenseData] = useState<ExpenseEntry[]>([]);
  const [contractData, setContractData] = useState<ContractEntry[]>([]);

  useEffect(() => {
    fetchFinancialData();
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      const token = localStorage.getItem("sisg_admin_token");
      const response = await fetch("/api/admin/contracts", {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (response.ok) {
        const data = await response.json();
        setContractData(data.map((c: any, i: number) => ({
          id: c.id || i + 1,
          name: c.title || c.name || "Untitled",
          value: c.value || 0,
          status: c.status || "active",
          endDate: c.endDate || "",
        })));
      }
    } catch (error) {
      console.error("Error fetching contracts:", error);
    }
  };

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
        if (data.revenueByMonth) setRevenueData(data.revenueByMonth);
        if (data.serviceLines) setServiceLineData(data.serviceLines);
        if (data.expenses) setExpenseData(data.expenses);
      } else {
        // No data available — show empty state
        setFinancialData({ totalRevenue: 0, totalExpenses: 0, netProfit: 0, profitMargin: 0 });
        calculateKPIs({ totalRevenue: 0, totalExpenses: 0, netProfit: 0, profitMargin: 0 });
        toast("Financial data unavailable", { description: "Connect your accounting integration to populate financial dashboards" });
      }
    } catch (error) {
      console.error("Error fetching financials:", error);
      setFinancialData({ totalRevenue: 0, totalExpenses: 0, netProfit: 0, profitMargin: 0 });
      calculateKPIs({ totalRevenue: 0, totalExpenses: 0, netProfit: 0, profitMargin: 0 });
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
            className="text-xl sm:text-3xl font-bold text-white"
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
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueData}>
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
              <div className="flex items-center justify-center h-[300px]">
                <div className="text-center">
                  <TrendingUp className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No revenue data available</p>
                  <p className="text-gray-600 text-xs mt-1">Data will populate once financial integrations are configured</p>
                </div>
              </div>
            )}
          </div>

          {/* Service Line Revenue */}
          <div className="tech-card p-5 border border-gray-700">
            <h2
              className="text-lg font-bold text-white mb-4"
              style={{ fontFamily: "Sora, sans-serif" }}
            >
              Revenue by Service Line
            </h2>
            {serviceLineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={serviceLineData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" stroke="#9ca3af" />
                  <YAxis dataKey="name" type="category" stroke="#9ca3af" width={100} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="#00d4ff" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px]">
                <div className="text-center">
                  <PieChartIcon className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No service line data available</p>
                </div>
              </div>
            )}
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
            {expenseData.length > 0 ? (
              <div className="space-y-4">
                {expenseData.map((expense, index) => (
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
            ) : (
              <div className="flex items-center justify-center h-[200px]">
                <div className="text-center">
                  <TrendingDown className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No expense data available</p>
                </div>
              </div>
            )}
          </div>

          {/* Budget Summary */}
          <div className="tech-card p-5 border border-gray-700 space-y-4">
            <h2
              className="text-lg font-bold text-white"
              style={{ fontFamily: "Sora, sans-serif" }}
            >
              Budget Summary
            </h2>
            {financialData && financialData.totalRevenue > 0 ? (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                      Actual Spend
                    </p>
                    <p className="text-sm font-semibold text-emerald-400">
                      {financialData.totalExpenses > 0 ? `${((financialData.totalExpenses / financialData.totalRevenue) * 100).toFixed(1)}%` : "0%"}
                    </p>
                  </div>
                  <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${financialData.totalExpenses > 0 ? ((financialData.totalExpenses / financialData.totalRevenue) * 100).toFixed(1) : 0}%` }}
                      transition={{ duration: 0.5 }}
                      className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700">
                  <div>
                    <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Revenue</p>
                    <p className="text-xl font-bold text-white mt-1">${(financialData.totalRevenue / 1000000).toFixed(1)}M</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Expenses</p>
                    <p className="text-xl font-bold text-emerald-400 mt-1">${(financialData.totalExpenses / 1000000).toFixed(2)}M</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-700">
                  <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-2">Net Profit</p>
                  <p className="text-xl font-bold text-cyan-400">${(financialData.netProfit / 1000000).toFixed(2)}M</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <DollarSign className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No budget data available</p>
                <p className="text-gray-600 text-xs mt-1">Connect financial data source to populate</p>
              </div>
            )}
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
          {contractData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left text-[10px] font-mono text-gray-600 uppercase tracking-widest py-3">Contract Name</th>
                    <th className="text-right text-[10px] font-mono text-gray-600 uppercase tracking-widest py-3">Value</th>
                    <th className="text-center text-[10px] font-mono text-gray-600 uppercase tracking-widest py-3">Status</th>
                    <th className="text-right text-[10px] font-mono text-gray-600 uppercase tracking-widest py-3">End Date</th>
                  </tr>
                </thead>
                <tbody>
                  {contractData.map((contract) => (
                    <tr key={contract.id} className="border-b border-gray-800 hover:bg-gray-800/30 transition">
                      <td className="py-3 text-white">{contract.name}</td>
                      <td className="py-3 text-right font-semibold text-cyan-400">
                        {contract.value >= 1000000 ? `$${(contract.value / 1000000).toFixed(1)}M` : `$${(contract.value / 1000).toFixed(0)}K`}
                      </td>
                      <td className="py-3 text-center">
                        <span className={`text-xs px-2 py-1 rounded border ${contract.status === "active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : contract.status === "bidding" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" : "bg-blue-500/10 text-blue-400 border-blue-500/30"}`}>
                          {contract.status}
                        </span>
                      </td>
                      <td className="py-3 text-right text-gray-400">{contract.endDate ? new Date(contract.endDate).toLocaleDateString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <DollarSign className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No contracts in revenue tracking</p>
              <p className="text-gray-600 text-xs mt-1">Add contracts via the Bidding Pipeline to track revenue</p>
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
