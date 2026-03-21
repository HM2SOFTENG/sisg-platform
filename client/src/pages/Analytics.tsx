/* Analytics Page — Sentinel Sharp v2 */
import { motion } from "framer-motion";
import { AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import DashboardLayout from "@/components/DashboardLayout";

const winRateData = [
  { month: "Oct", rate: 58 }, { month: "Nov", rate: 62 }, { month: "Dec", rate: 55 },
  { month: "Jan", rate: 65 }, { month: "Feb", rate: 70 }, { month: "Mar", rate: 68 },
];
const headcountData = [
  { month: "Oct", count: 118 }, { month: "Nov", count: 122 }, { month: "Dec", count: 125 },
  { month: "Jan", count: 130 }, { month: "Feb", count: 138 }, { month: "Mar", count: 147 },
];
const radarData = [
  { subject: "Cybersecurity", value: 95 },
  { subject: "Cloud", value: 82 },
  { subject: "Software Dev", value: 78 },
  { subject: "Consulting", value: 88 },
  { subject: "Compliance", value: 97 },
  { subject: "Training", value: 72 },
];
const serviceData = [
  { name: "Cybersecurity", revenue: 5.2, color: "#0066ff" },
  { name: "Cloud", revenue: 3.8, color: "#8b5cf6" },
  { name: "Software", revenue: 2.9, color: "#00d4ff" },
  { name: "Consulting", revenue: 2.3, color: "#00e5a0" },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[oklch(0.1_0.025_255)] border border-white/10 px-3 py-2 text-xs font-mono">
        <div className="text-gray-400 mb-1">{label}</div>
        <div className="text-white font-bold">{payload[0].value}{payload[0].name === "rate" ? "%" : payload[0].name === "count" ? " FTE" : "M"}</div>
      </div>
    );
  }
  return null;
};

export default function Analytics() {
  return (
    <DashboardLayout title="Analytics">
      <div className="mb-6">
        <div className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-1">Business Intelligence</div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
          Performance <span className="gradient-text">Analytics</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Win Rate */}
        <div className="tech-card p-5">
          <div className="text-[10px] font-mono text-gray-600 uppercase tracking-wider mb-1">Proposal Win Rate</div>
          <div className="text-white font-bold text-sm mb-4" style={{ fontFamily: "Sora, sans-serif" }}>6-Month Trend (%)</div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={winRateData}>
              <defs>
                <linearGradient id="winGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00e5a0" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00e5a0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fill: "rgba(107,114,128,1)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(107,114,128,1)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} domain={[40, 80]} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="rate" stroke="#00e5a0" strokeWidth={2} fill="url(#winGrad)" name="rate" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Headcount */}
        <div className="tech-card p-5">
          <div className="text-[10px] font-mono text-gray-600 uppercase tracking-wider mb-1">Headcount Growth</div>
          <div className="text-white font-bold text-sm mb-4" style={{ fontFamily: "Sora, sans-serif" }}>Total FTE Over Time</div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={headcountData}>
              <defs>
                <linearGradient id="hcGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fill: "rgba(107,114,128,1)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(107,114,128,1)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} domain={[100, 160]} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} fill="url(#hcGrad)" name="count" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Service Revenue */}
        <div className="tech-card p-5">
          <div className="text-[10px] font-mono text-gray-600 uppercase tracking-wider mb-1">Revenue by Service</div>
          <div className="text-white font-bold text-sm mb-4" style={{ fontFamily: "Sora, sans-serif" }}>YTD Revenue ($M)</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={serviceData} layout="vertical">
              <XAxis type="number" tick={{ fill: "rgba(107,114,128,1)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fill: "rgba(156,163,175,1)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" radius={[0, 0, 0, 0]} maxBarSize={18} name="revenue">
                {serviceData.map((entry) => (
                  <Cell key={`cell-${entry.name}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Capability Radar */}
        <div className="tech-card p-5">
          <div className="text-[10px] font-mono text-gray-600 uppercase tracking-wider mb-1">Capability Assessment</div>
          <div className="text-white font-bold text-sm mb-4" style={{ fontFamily: "Sora, sans-serif" }}>Service Maturity Score</div>
          <ResponsiveContainer width="100%" height={160}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.08)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: "rgba(107,114,128,1)", fontSize: 10, fontFamily: "JetBrains Mono" }} />
              <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
              <Radar dataKey="value" stroke="#0066ff" fill="#0066ff" fillOpacity={0.15} strokeWidth={1.5} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </DashboardLayout>
  );
}
