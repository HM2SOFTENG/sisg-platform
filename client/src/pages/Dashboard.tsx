/* Dashboard Overview — Sentinel Sharp v2 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Shield, Users, DollarSign, AlertTriangle, CheckCircle2, Clock, ArrowUpRight, Terminal } from "lucide-react";
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
      <div className="bg-[oklch(0.1_0.025_255)] border border-white/10 px-3 py-2">
        <div className="text-gray-400 text-xs font-mono mb-1">{label}</div>
        <div className="text-white font-bold text-sm font-mono">${payload[0].value}M</div>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [kpis, setKpis] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [pipelineData, setPipelineData] = useState<any[]>([]);
  const [activityFeed, setActivityFeed] = useState<any[]>([]);
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [loadingRevenue, setLoadingRevenue] = useState(true);
  const [loadingPipeline, setLoadingPipeline] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("sisg_admin_token");
      if (!token) {
        toast.error("Authentication token not found");
        return;
      }

      try {
        // Fetch stats for KPIs
        setLoadingKpis(true);
        const statsRes = await fetch("/api/admin/stats", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          const kpiArray = [
            { label: "Revenue YTD", value: statsData.revenueYtd || "$0", delta: statsData.revenueDelta || "+0%", icon: DollarSign, color: "#00e5a0" },
            { label: "Active Contracts", value: statsData.activeContracts || "0", delta: `+${statsData.contractsDelta || 0}`, icon: Shield, color: "#0066ff" },
            { label: "Team Size", value: statsData.teamSize || "0", delta: `+${statsData.teamDelta || 0}`, icon: Users, color: "#00d4ff" },
            { label: "Win Rate", value: statsData.winRate || "0%", delta: `+${statsData.winRateDelta || 0}%`, icon: TrendingUp, color: "#ffb800" },
          ];
          setKpis(kpiArray);
        }
        setLoadingKpis(false);

        // Fetch revenue data
        setLoadingRevenue(true);
        const revRes = await fetch("/api/admin/stats", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (revRes.ok) {
          const revData = await revRes.json();
          setRevenueData(revData.revenueData || []);
        }
        setLoadingRevenue(false);

        // Fetch pipeline data
        setLoadingPipeline(true);
        const pipRes = await fetch("/api/admin/stats", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (pipRes.ok) {
          const pipData = await pipRes.json();
          const pipeline = (pipData.pipelineData || []).map((d: any) => ({
            name: d.name,
            value: d.value,
            color: d.color || "#0066ff",
          }));
          setPipelineData(pipeline);
        }
        setLoadingPipeline(false);

        // Fetch activity feed
        setLoadingActivity(true);
        const actRes = await fetch("/api/admin/activity", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (actRes.ok) {
          const actData = await actRes.json();
          setActivityFeed(actData.activities || []);
        }
        setLoadingActivity(false);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        toast.error("Failed to load dashboard data");
        setLoadingKpis(false);
        setLoadingRevenue(false);
        setLoadingPipeline(false);
        setLoadingActivity(false);
      }
    };

    fetchData();
  }, []);

  return (
    <DashboardLayout title="Overview">
      <div className="mb-6">
        <div className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-1">Dashboard</div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
          Operations <span className="gradient-text">Overview</span>
        </h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {loadingKpis ? (
          Array.from({ length: 4 }).map((_, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07, duration: 0.4 }}>
              <div className="tech-card p-4">
                <SkeletonLoader />
              </div>
            </motion.div>
          ))
        ) : kpis.length === 0 ? (
          <div className="col-span-1 sm:col-span-2 lg:col-span-4 tech-card p-4 text-center text-gray-500">No KPI data available</div>
        ) : (
          kpis.map((kpi, i) => (
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
          ))
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 auto-rows-max md:auto-rows-auto">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 md:col-span-2 tech-card p-4 sm:p-5 min-h-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] font-mono text-gray-600 uppercase tracking-wider">Revenue Trend</div>
              <div className="text-white font-bold text-sm mt-0.5" style={{ fontFamily: "Sora, sans-serif" }}>Monthly Revenue ($M)</div>
            </div>
            <span className="text-[10px] font-mono text-[#00e5a0] border border-[#00e5a0]/30 bg-[#00e5a0]/8 px-2 py-1">+18% YoY</span>
          </div>
          {loadingRevenue ? (
            <div className="h-[180px] flex items-center justify-center text-gray-500">Loading chart...</div>
          ) : revenueData.length === 0 ? (
            <div className="h-[180px] flex items-center justify-center text-gray-500">No revenue data available</div>
          ) : (
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
          )}
        </div>

        {/* Pipeline Mix */}
        <div className="md:col-span-2 lg:col-span-1 tech-card p-4 sm:p-5 min-h-0">
          <div className="text-[10px] font-mono text-gray-600 uppercase tracking-wider mb-1">Pipeline Mix</div>
          <div className="text-white font-bold text-sm mb-4" style={{ fontFamily: "Sora, sans-serif" }}>By Service Line</div>
          {loadingPipeline ? (
            <div className="h-[130px] flex items-center justify-center text-gray-500">Loading chart...</div>
          ) : pipelineData.length === 0 ? (
            <div className="h-[130px] flex items-center justify-center text-gray-500">No pipeline data available</div>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* Activity Feed */}
      <div className="tech-card p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-4">
          <Terminal className="w-4 h-4 text-[#0066ff]" />
          <div className="text-white font-bold text-sm" style={{ fontFamily: "Sora, sans-serif" }}>Activity Feed</div>
        </div>
        {loadingActivity ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonLoader key={i} />
            ))}
          </div>
        ) : activityFeed.length === 0 ? (
          <div className="text-center text-gray-500 py-4">No activity data available</div>
        ) : (
          <div className="space-y-3">
            {activityFeed.map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06, duration: 0.3 }}>
                <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                  <div className="w-1.5 h-1.5 mt-1.5 flex-shrink-0" style={{ background: item.color || "#0066ff" }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-300 text-xs sm:text-sm leading-relaxed break-words">{item.msg || item.message}</div>
                  </div>
                  <div className="text-gray-600 text-[9px] sm:text-[10px] font-mono flex-shrink-0 whitespace-nowrap">{item.time || "recently"}</div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
