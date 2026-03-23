/* Finance Page — Sentinel Sharp v2 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { DollarSign, TrendingUp, TrendingDown, FileText } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";

const SkeletonLoader = () => (
  <div className="animate-pulse space-y-2">
    <div className="h-4 bg-gray-700 rounded w-3/4"></div>
    <div className="h-4 bg-gray-700 rounded"></div>
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[oklch(0.1_0.025_255)] border border-white/10 px-3 py-2 text-xs font-mono">
        <div className="text-gray-400 mb-1">{label}</div>
        {payload.map((p: any) => (
          <div key={p.name} style={{ color: p.color }}>{p.name}: ${p.value}K</div>
        ))}
      </div>
    );
  }
  return null;
};

export default function Finance() {
  const [financialKpis, setFinancialKpis] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [loadingChart, setLoadingChart] = useState(true);
  const [loadingContracts, setLoadingContracts] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("sisg_admin_token");
      if (!token) {
        toast.error("Authentication token not found");
        return;
      }

      try {
        // Fetch financial KPIs
        setLoadingKpis(true);
        const finRes = await fetch("/api/admin/financials", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (finRes.ok) {
          const finData = await finRes.json();
          const kpiArray = [
            { label: "Total Revenue YTD", value: finData.totalRevenueYtd || "$0", delta: finData.revenueDelta || "+0%", up: true, color: "#00e5a0" },
            { label: "Total Expenses YTD", value: finData.totalExpensesYtd || "$0", delta: finData.expensesDelta || "+0%", up: false, color: "#ff3b3b" },
            { label: "Net Profit", value: finData.netProfit || "$0", delta: finData.profitDelta || "+0%", up: true, color: "#0066ff" },
            { label: "Pipeline Value", value: finData.pipelineValue || "$0", delta: finData.pipelineDelta || "+0%", up: true, color: "#ffb800" },
          ];
          setFinancialKpis(kpiArray);
        }
        setLoadingKpis(false);

        // Fetch monthly financial data for chart
        setLoadingChart(true);
        const chartRes = await fetch("/api/admin/financials", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (chartRes.ok) {
          const chartData = await chartRes.json();
          setMonthlyData(chartData.monthlyData || []);
        }
        setLoadingChart(false);

        // Fetch contracts
        setLoadingContracts(true);
        const contractRes = await fetch("/api/admin/contracts", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (contractRes.ok) {
          const contractData = await contractRes.json();
          setContracts(contractData.contracts || []);
        }
        setLoadingContracts(false);
      } catch (error) {
        console.error("Failed to fetch finance data:", error);
        toast.error("Failed to load finance data");
        setLoadingKpis(false);
        setLoadingChart(false);
        setLoadingContracts(false);
      }
    };

    fetchData();
  }, []);

  return (
    <DashboardLayout title="Finance">
      <div className="mb-6">
        <div className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-1">Financial Hub</div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
          Financial <span className="gradient-text">Overview</span>
        </h1>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-6">
        {loadingKpis ? (
          Array.from({ length: 4 }).map((_, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07, duration: 0.4 }}>
              <div className="tech-card p-3 sm:p-4">
                <SkeletonLoader />
              </div>
            </motion.div>
          ))
        ) : financialKpis.length === 0 ? (
          <div className="col-span-2 lg:col-span-4 tech-card p-3 sm:p-4 text-center text-gray-500 text-xs sm:text-sm">No financial data available</div>
        ) : (
          financialKpis.map((kpi, i) => (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07, duration: 0.4 }}>
              <div className="tech-card p-3 sm:p-4">
                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                  <DollarSign className="w-3 sm:w-4 h-3 sm:h-4" style={{ color: kpi.color }} />
                  <div className="flex items-center gap-0.5 sm:gap-1" style={{ color: kpi.color }}>
                    {kpi.up ? <TrendingUp className="w-2.5 sm:w-3 h-2.5 sm:h-3" /> : <TrendingDown className="w-2.5 sm:w-3 h-2.5 sm:h-3" />}
                    <span className="text-[8px] sm:text-[10px] font-mono font-bold">{kpi.delta}</span>
                  </div>
                </div>
                <div className="text-lg sm:text-xl font-bold text-white mb-0.5" style={{ fontFamily: "Sora, sans-serif" }}>{kpi.value}</div>
                <div className="text-gray-500 text-[10px] sm:text-xs font-mono">{kpi.label}</div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Revenue vs Expenses Chart */}
      <div className="tech-card p-3 sm:p-5 mb-6 overflow-x-auto">
        <div className="text-[9px] sm:text-[10px] font-mono text-gray-600 uppercase tracking-wider mb-1">Financial Performance</div>
        <div className="text-white font-bold text-xs sm:text-sm mb-3 sm:mb-4" style={{ fontFamily: "Sora, sans-serif" }}>Revenue vs Expenses ($K)</div>
        {loadingChart ? (
          <div className="h-[200px] flex items-center justify-center text-gray-500">Loading chart...</div>
        ) : monthlyData.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-gray-500">No financial data available</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} barGap={4}>
              <XAxis dataKey="month" tick={{ fill: "rgba(107,114,128,1)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(107,114,128,1)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" fill="#0066ff" radius={[0, 0, 0, 0]} maxBarSize={28} name="Revenue" />
              <Bar dataKey="expenses" fill="#8b5cf6" radius={[0, 0, 0, 0]} maxBarSize={28} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Contract Table */}
      <div className="tech-card overflow-hidden">
        <div className="p-3 sm:p-5 border-b border-white/8 flex items-center gap-2">
          <FileText className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-[#0066ff]" />
          <div className="text-white font-bold text-xs sm:text-sm" style={{ fontFamily: "Sora, sans-serif" }}>Contract Portfolio</div>
        </div>
        {loadingContracts ? (
          <div className="p-3 sm:p-5 text-center text-gray-500 text-xs sm:text-sm">Loading contracts...</div>
        ) : contracts.length === 0 ? (
          <div className="p-3 sm:p-5 text-center text-gray-500 text-xs sm:text-sm">No contracts available</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/8">
                  {["Contract", "Client", "Value", "Type", "Status"].map((h) => (
                    <th key={h} className="text-left px-2.5 sm:px-5 py-2 sm:py-3 text-[9px] sm:text-[10px] font-mono text-gray-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contracts.map((c, i) => (
                  <motion.tr key={c.name || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                    <td className="px-2.5 sm:px-5 py-2 sm:py-3">
                      <div className="text-white text-xs sm:text-sm font-medium whitespace-nowrap" style={{ fontFamily: "Sora, sans-serif" }}>{c.name}</div>
                    </td>
                    <td className="px-2.5 sm:px-5 py-2 sm:py-3 text-gray-500 text-[10px] sm:text-xs font-mono whitespace-nowrap">{c.client}</td>
                    <td className="px-2.5 sm:px-5 py-2 sm:py-3 text-white font-bold text-xs sm:text-sm font-mono whitespace-nowrap" style={{ color: c.color || "#0066ff" }}>{c.value}</td>
                    <td className="px-2.5 sm:px-5 py-2 sm:py-3">
                      <span className="text-[9px] sm:text-[10px] font-mono px-1.5 sm:px-2 py-0.5 border border-white/10 text-gray-400">{c.type}</span>
                    </td>
                    <td className="px-2.5 sm:px-5 py-2 sm:py-3">
                      <span
                        className="text-[9px] sm:text-[10px] font-mono px-1.5 sm:px-2 py-0.5 border whitespace-nowrap"
                        style={{
                          color: c.status === "Active" ? "#00e5a0" : c.status === "Pending" ? "#ffb800" : "#6b7280",
                          borderColor: (c.status === "Active" ? "#00e5a0" : c.status === "Pending" ? "#ffb800" : "#6b7280") + "30",
                          background: (c.status === "Active" ? "#00e5a0" : c.status === "Pending" ? "#ffb800" : "#6b7280") + "08",
                        }}
                      >
                        {c.status}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
