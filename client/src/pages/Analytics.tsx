/* Analytics Page — Sentinel Sharp v2 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";

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
  const [winRateData, setWinRateData] = useState<any[]>([]);
  const [headcountData, setHeadcountData] = useState<any[]>([]);
  const [radarData, setRadarData] = useState<any[]>([]);
  const [serviceData, setServiceData] = useState<any[]>([]);
  const [loadingWinRate, setLoadingWinRate] = useState(true);
  const [loadingHeadcount, setLoadingHeadcount] = useState(true);
  const [loadingRadar, setLoadingRadar] = useState(true);
  const [loadingService, setLoadingService] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("sisg_admin_token");
      if (!token) {
        toast.error("Authentication token not found");
        return;
      }

      try {
        // Fetch analytics data from /api/admin/stats
        const statsRes = await fetch("/api/admin/stats", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (statsRes.ok) {
          const statsData = await statsRes.json();

          // Win Rate Data
          setLoadingWinRate(true);
          setWinRateData(statsData.winRateData || []);
          setLoadingWinRate(false);

          // Headcount Data
          setLoadingHeadcount(true);
          setHeadcountData(statsData.headcountData || []);
          setLoadingHeadcount(false);

          // Radar Data (Capability Assessment)
          setLoadingRadar(true);
          setRadarData(statsData.radarData || []);
          setLoadingRadar(false);

          // Service Revenue Data
          setLoadingService(true);
          const serviceArray = (statsData.serviceData || []).map((d: any) => ({
            name: d.name,
            revenue: d.revenue,
            color: d.color || "#0066ff",
          }));
          setServiceData(serviceArray);
          setLoadingService(false);
        }
      } catch (error) {
        console.error("Failed to fetch analytics data:", error);
        toast.error("Failed to load analytics data");
        setLoadingWinRate(false);
        setLoadingHeadcount(false);
        setLoadingRadar(false);
        setLoadingService(false);
      }
    };

    fetchData();
  }, []);

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
          {loadingWinRate ? (
            <div className="h-[160px] flex items-center justify-center text-gray-500">Loading chart...</div>
          ) : winRateData.length === 0 ? (
            <div className="h-[160px] flex items-center justify-center text-gray-500">No data available</div>
          ) : (
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
          )}
        </div>

        {/* Headcount */}
        <div className="tech-card p-5">
          <div className="text-[10px] font-mono text-gray-600 uppercase tracking-wider mb-1">Headcount Growth</div>
          <div className="text-white font-bold text-sm mb-4" style={{ fontFamily: "Sora, sans-serif" }}>Total FTE Over Time</div>
          {loadingHeadcount ? (
            <div className="h-[160px] flex items-center justify-center text-gray-500">Loading chart...</div>
          ) : headcountData.length === 0 ? (
            <div className="h-[160px] flex items-center justify-center text-gray-500">No data available</div>
          ) : (
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
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Service Revenue */}
        <div className="tech-card p-5">
          <div className="text-[10px] font-mono text-gray-600 uppercase tracking-wider mb-1">Revenue by Service</div>
          <div className="text-white font-bold text-sm mb-4" style={{ fontFamily: "Sora, sans-serif" }}>YTD Revenue ($M)</div>
          {loadingService ? (
            <div className="h-[160px] flex items-center justify-center text-gray-500">Loading chart...</div>
          ) : serviceData.length === 0 ? (
            <div className="h-[160px] flex items-center justify-center text-gray-500">No data available</div>
          ) : (
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
          )}
        </div>

        {/* Capability Radar */}
        <div className="tech-card p-5">
          <div className="text-[10px] font-mono text-gray-600 uppercase tracking-wider mb-1">Capability Assessment</div>
          <div className="text-white font-bold text-sm mb-4" style={{ fontFamily: "Sora, sans-serif" }}>Service Maturity Score</div>
          {loadingRadar ? (
            <div className="h-[160px] flex items-center justify-center text-gray-500">Loading chart...</div>
          ) : radarData.length === 0 ? (
            <div className="h-[160px] flex items-center justify-center text-gray-500">No data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "rgba(107,114,128,1)", fontSize: 10, fontFamily: "JetBrains Mono" }} />
                <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                <Radar dataKey="value" stroke="#0066ff" fill="#0066ff" fillOpacity={0.15} strokeWidth={1.5} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
