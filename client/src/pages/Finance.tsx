/* Finance Page — Sentinel Sharp v2 */
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { DollarSign, TrendingUp, TrendingDown, FileText } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

const monthlyData = [
  { month: "Oct", revenue: 1800, expenses: 1200 },
  { month: "Nov", revenue: 2100, expenses: 1350 },
  { month: "Dec", revenue: 1900, expenses: 1180 },
  { month: "Jan", revenue: 2400, expenses: 1520 },
  { month: "Feb", revenue: 2800, expenses: 1680 },
  { month: "Mar", revenue: 3200, expenses: 1850 },
];

const contracts = [
  { name: "DoD CMMC Assessment", client: "Dept of Defense", value: "$2.4M", status: "Active", type: "T&M", color: "#0066ff" },
  { name: "VA Cloud Migration", client: "Dept of Veterans Affairs", value: "$5.8M", status: "Active", type: "FFP", color: "#8b5cf6" },
  { name: "DHS Zero Trust", client: "Dept of Homeland Security", value: "$3.1M", status: "Pending", type: "CPFF", color: "#00d4ff" },
  { name: "GSA IT Modernization", client: "General Services Admin", value: "$1.9M", status: "Closed", type: "FFP", color: "#00e5a0" },
  { name: "FBI IR Retainer", client: "Federal Bureau of Investigation", value: "$890K", status: "Active", type: "T&M", color: "#ff3b3b" },
];

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
  return (
    <DashboardLayout title="Finance">
      <div className="mb-6">
        <div className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-1">Financial Hub</div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
          Financial <span className="gradient-text">Overview</span>
        </h1>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Revenue YTD", value: "$14.2M", delta: "+18%", up: true, color: "#00e5a0" },
          { label: "Total Expenses YTD", value: "$8.8M", delta: "+12%", up: false, color: "#ff3b3b" },
          { label: "Net Profit", value: "$5.4M", delta: "+28%", up: true, color: "#0066ff" },
          { label: "Pipeline Value", value: "$22.1M", delta: "+35%", up: true, color: "#ffb800" },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07, duration: 0.4 }}>
            <div className="tech-card p-4">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-4 h-4" style={{ color: kpi.color }} />
                <div className="flex items-center gap-1" style={{ color: kpi.color }}>
                  {kpi.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  <span className="text-[10px] font-mono font-bold">{kpi.delta}</span>
                </div>
              </div>
              <div className="text-xl font-bold text-white mb-0.5" style={{ fontFamily: "Sora, sans-serif" }}>{kpi.value}</div>
              <div className="text-gray-500 text-xs font-mono">{kpi.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Revenue vs Expenses Chart */}
      <div className="tech-card p-5 mb-6">
        <div className="text-[10px] font-mono text-gray-600 uppercase tracking-wider mb-1">Financial Performance</div>
        <div className="text-white font-bold text-sm mb-4" style={{ fontFamily: "Sora, sans-serif" }}>Revenue vs Expenses ($K)</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlyData} barGap={4}>
            <XAxis dataKey="month" tick={{ fill: "rgba(107,114,128,1)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "rgba(107,114,128,1)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="revenue" fill="#0066ff" radius={[0, 0, 0, 0]} maxBarSize={28} name="Revenue" />
            <Bar dataKey="expenses" fill="#8b5cf6" radius={[0, 0, 0, 0]} maxBarSize={28} name="Expenses" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Contract Table */}
      <div className="tech-card overflow-hidden">
        <div className="p-5 border-b border-white/8 flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#0066ff]" />
          <div className="text-white font-bold text-sm" style={{ fontFamily: "Sora, sans-serif" }}>Contract Portfolio</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/8">
                {["Contract", "Client", "Value", "Type", "Status"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-[10px] font-mono text-gray-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contracts.map((c, i) => (
                <motion.tr key={c.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                  <td className="px-5 py-3">
                    <div className="text-white text-sm font-medium whitespace-nowrap" style={{ fontFamily: "Sora, sans-serif" }}>{c.name}</div>
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs font-mono whitespace-nowrap">{c.client}</td>
                  <td className="px-5 py-3 text-white font-bold text-sm font-mono whitespace-nowrap" style={{ color: c.color }}>{c.value}</td>
                  <td className="px-5 py-3">
                    <span className="text-[10px] font-mono px-2 py-0.5 border border-white/10 text-gray-400">{c.type}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className="text-[10px] font-mono px-2 py-0.5 border whitespace-nowrap"
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
      </div>
    </DashboardLayout>
  );
}
