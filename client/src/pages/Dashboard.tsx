/* Dashboard Overview — Sentinel Sharp v2 */
import { motion } from "framer-motion";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Shield, Users, DollarSign, AlertTriangle, CheckCircle2, Clock, ArrowUpRight, Terminal } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

const revenueData = [
  { month: "Oct", value: 1.8 }, { month: "Nov", value: 2.1 }, { month: "Dec", value: 1.9 },
  { month: "Jan", value: 2.4 }, { month: "Feb", value: 2.8 }, { month: "Mar", value: 3.2 },
];
const pipelineData = [
  { name: "Cybersecurity", value: 42, color: "#0066ff" },
  { name: "Cloud", value: 28, color: "#8b5cf6" },
  { name: "Software", value: 18, color: "#00d4ff" },
  { name: "Consulting", value: 12, color: "#00e5a0" },
];
const activityFeed = [
  { type: "contract", msg: "DoD CMMC Assessment contract awarded — $2.4M", time: "2h ago", color: "#00e5a0" },
  { type: "alert", msg: "Critical vulnerability detected on client network", time: "4h ago", color: "#ff3b3b" },
  { type: "hire", msg: "New hire: Senior Cloud Architect onboarded", time: "6h ago", color: "#0066ff" },
  { type: "cert", msg: "ISO 27001 annual audit completed — passed", time: "1d ago", color: "#00d4ff" },
  { type: "proposal", msg: "GSA Schedule proposal submitted — $5.8M", time: "2d ago", color: "#ffb800" },
];
const kpis = [
  { label: "Revenue YTD", value: "$14.2M", delta: "+18%", icon: DollarSign, color: "#00e5a0" },
  { label: "Active Contracts", value: "23", delta: "+3", icon: Shield, color: "#0066ff" },
  { label: "Team Size", value: "147", delta: "+12", icon: Users, color: "#00d4ff" },
  { label: "Win Rate", value: "68%", delta: "+5%", icon: TrendingUp, color: "#ffb800" },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[oklch(0.1_0.025_255)] border border-white/10 px-3 py-2">
        <div className="text-gray-400 text-xs font-mono mb-1">{label}</div>
        <div className="text-white font-bold text-sm font-mono">${payload[0].value}M</div>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  return (
    <DashboardLayout title="Overview">
      <div className="mb-6">
        <div className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-1">Dashboard</div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
          Operations <span className="gradient-text">Overview</span>
        </h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07, duration: 0.4 }}>
            <div className="tech-card p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="w-8 h-8 flex items-center justify-center" style={{ background: kpi.color + "15", border: `1px solid ${kpi.color}30` }}>
                  <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
                </div>
                <span className="text-[10px] font-mono font-bold" style={{ color: kpi.color }}>{kpi.delta}</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white mb-0.5" style={{ fontFamily: "Sora, sans-serif" }}>{kpi.value}</div>
              <div className="text-gray-500 text-xs font-mono">{kpi.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 tech-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] font-mono text-gray-600 uppercase tracking-wider">Revenue Trend</div>
              <div className="text-white font-bold text-sm mt-0.5" style={{ fontFamily: "Sora, sans-serif" }}>Monthly Revenue ($M)</div>
            </div>
            <span className="text-[10px] font-mono text-[#00e5a0] border border-[#00e5a0]/30 bg-[#00e5a0]/8 px-2 py-1">+18% YoY</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0066ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0066ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fill: "rgba(107,114,128,1)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(107,114,128,1)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="value" stroke="#0066ff" strokeWidth={2} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pipeline Mix */}
        <div className="tech-card p-5">
          <div className="text-[10px] font-mono text-gray-600 uppercase tracking-wider mb-1">Pipeline Mix</div>
          <div className="text-white font-bold text-sm mb-4" style={{ fontFamily: "Sora, sans-serif" }}>By Service Line</div>
          <ResponsiveContainer width="100%" height={130}>
            <PieChart>
              <Pie data={pipelineData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" strokeWidth={0}>
                {pipelineData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {pipelineData.map((d) => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 flex-shrink-0" style={{ background: d.color }} />
                  <span className="text-gray-400 text-xs font-mono">{d.name}</span>
                </div>
                <span className="text-white text-xs font-mono font-bold">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="tech-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Terminal className="w-4 h-4 text-[#0066ff]" />
          <div className="text-white font-bold text-sm" style={{ fontFamily: "Sora, sans-serif" }}>Activity Feed</div>
        </div>
        <div className="space-y-3">
          {activityFeed.map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06, duration: 0.3 }}>
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 mt-1.5 flex-shrink-0" style={{ background: item.color }} />
                <div className="flex-1 min-w-0">
                  <div className="text-gray-300 text-sm leading-relaxed">{item.msg}</div>
                </div>
                <div className="text-gray-600 text-[10px] font-mono flex-shrink-0">{item.time}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
