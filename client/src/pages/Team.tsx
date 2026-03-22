/* Team Page — Sentinel Sharp v2 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Shield, Mail, Phone, Plus, Users } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "sonner";

interface TeamMember {
  id: number;
  name: string;
  role: string;
  dept: string;
  clearance: string;
  utilization: number;
  color: string;
  initials: string;
}

const deptColors = ["#0066ff", "#00d4ff", "#8b5cf6", "#00e5a0", "#ffb800", "#ff6b35"];

export default function Team() {
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("All");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [depts, setDepts] = useState<string[]>(["All"]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    try {
      const token = localStorage.getItem("sisg_admin_token");
      const response = await fetch("/api/admin/team", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const mapped = data.map((m: any, i: number) => ({
          id: m.id || i + 1,
          name: m.name || "Unknown",
          role: m.role || m.title || "Team Member",
          dept: m.department || m.dept || "General",
          clearance: m.clearance || "Public Trust",
          utilization: m.utilization || 0,
          color: deptColors[i % deptColors.length],
          initials: (m.name || "U").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
        }));
        setMembers(mapped);
        const uniqueDepts = ["All", ...new Set<string>(mapped.map((m: TeamMember) => m.dept))];
        setDepts(uniqueDepts);
      }
    } catch (error) {
      console.error("Failed to fetch team:", error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = members.filter((m) => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.role.toLowerCase().includes(search.toLowerCase());
    const matchDept = dept === "All" || m.dept === dept;
    return matchSearch && matchDept;
  });

  return (
    <DashboardLayout title="Team">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-1">People</div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
            Team <span className="gradient-text">Directory</span>
          </h1>
        </div>
        <button onClick={() => toast.info("Feature coming soon")} className="btn-tech text-xs py-2 px-4 self-start sm:self-auto">
          <Plus className="w-3.5 h-3.5" /> Add Member
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[oklch(0.085_0.025_255)] border border-white/8 text-gray-300 text-xs pl-9 pr-3 py-2.5 focus:outline-none focus:border-[#0066ff]/30 font-mono placeholder:text-gray-700"
            placeholder="Search team..."
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {depts.map((d) => (
            <button
              key={d}
              onClick={() => setDept(d)}
              className="text-xs font-mono px-3 py-2 border transition-all"
              style={
                dept === d
                  ? { borderColor: "#0066ff", background: "#0066ff15", color: "#00d4ff" }
                  : { borderColor: "rgba(255,255,255,0.08)", color: "rgba(107,114,128,1)" }
              }
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Team Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="tech-card p-5 animate-pulse">
              <div className="h-[2px] mb-4 -mx-5 -mt-5 bg-white/5" />
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-white/5 rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/8 rounded w-3/4" />
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="tech-card p-10 text-center">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 mb-1">No team members found</p>
          <p className="text-gray-500 text-sm">Add team members to populate the directory</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((member, i) => (
          <motion.div key={member.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.4 }}>
            <div className="tech-card p-5">
              <div className="h-[2px] mb-4 -mx-5 -mt-5" style={{ background: `linear-gradient(90deg, ${member.color}, transparent)` }} />
              <div className="flex items-start gap-3 mb-4">
                <div
                  className="w-10 h-10 flex items-center justify-center font-bold text-sm flex-shrink-0"
                  style={{ background: member.color + "20", border: `1px solid ${member.color}40`, color: member.color, fontFamily: "Sora, sans-serif" }}
                >
                  {member.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-bold text-sm leading-snug truncate" style={{ fontFamily: "Sora, sans-serif" }}>{member.name}</div>
                  <div className="text-gray-500 text-xs font-mono truncate">{member.role}</div>
                </div>
              </div>

              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono px-2 py-0.5 border" style={{ color: "#0066ff", borderColor: "#0066ff30", background: "#0066ff08" }}>
                  {member.dept}
                </span>
                <div className="flex items-center gap-1">
                  <Shield className="w-3 h-3 text-gray-600" />
                  <span className="text-gray-500 text-[10px] font-mono">{member.clearance}</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-gray-600 text-[10px] font-mono">Utilization</span>
                  <span className="text-xs font-mono font-bold" style={{ color: member.color }}>{member.utilization}%</span>
                </div>
                <div className="progress-bar">
                  <motion.div
                    className="progress-bar-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${member.utilization}%` }}
                    transition={{ duration: 0.8, delay: i * 0.05, ease: "easeOut" }}
                    style={{ background: `linear-gradient(90deg, ${member.color}, ${member.color}cc)` }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      )}
    </DashboardLayout>
  );
}
