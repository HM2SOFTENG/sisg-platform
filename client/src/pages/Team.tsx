/* Team Page — Sentinel Sharp v2 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Shield, Plus, Users } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "sonner";

interface TeamMember {
  id: string | number;
  name: string;
  role?: string;
  dept?: string;
  clearance?: string;
  utilization?: number;
  color?: string;
  initials?: string;
}

const DEFAULT_COLOR = "#0066ff";

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export default function Team() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("All");

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("sisg_admin_token");
      const response = await fetch("/api/admin/team", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setMembers(data);
      } else {
        toast.error("Failed to load team");
      }
    } catch (error) {
      console.error("Error fetching team:", error);
      toast.error("Failed to load team");
    } finally {
      setLoading(false);
    }
  };

  // Derive dept list from actual data
  const depts = ["All", ...Array.from(new Set(members.map((m) => m.dept).filter(Boolean) as string[]))];

  const filtered = members.filter((m) => {
    const matchSearch =
      m.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.role?.toLowerCase().includes(search.toLowerCase());
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

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-48 text-gray-500 font-mono text-xs">
          Loading team...
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 text-gray-600 font-mono text-xs gap-2">
          <Users className="w-8 h-8 opacity-30" />
          <span>{members.length === 0 ? "No team members yet." : "No members match your filter."}</span>
        </div>
      )}

      {/* Team Grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((member, i) => {
            const color = member.color || DEFAULT_COLOR;
            const initials = member.initials || getInitials(member.name);
            const utilization = member.utilization ?? 0;
            return (
              <motion.div key={member.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.4 }}>
                <div className="tech-card p-5">
                  <div className="h-[2px] mb-4 -mx-5 -mt-5" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
                  <div className="flex items-start gap-3 mb-4">
                    <div
                      className="w-10 h-10 flex items-center justify-center font-bold text-sm flex-shrink-0"
                      style={{ background: color + "20", border: `1px solid ${color}40`, color, fontFamily: "Sora, sans-serif" }}
                    >
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-bold text-sm leading-snug truncate" style={{ fontFamily: "Sora, sans-serif" }}>{member.name}</div>
                      {member.role && <div className="text-gray-500 text-xs font-mono truncate">{member.role}</div>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    {member.dept && (
                      <span className="text-[10px] font-mono px-2 py-0.5 border" style={{ color: "#0066ff", borderColor: "#0066ff30", background: "#0066ff08" }}>
                        {member.dept}
                      </span>
                    )}
                    {member.clearance && (
                      <div className="flex items-center gap-1">
                        <Shield className="w-3 h-3 text-gray-600" />
                        <span className="text-gray-500 text-[10px] font-mono">{member.clearance}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-gray-600 text-[10px] font-mono">Utilization</span>
                      <span className="text-xs font-mono font-bold" style={{ color }}>{utilization}%</span>
                    </div>
                    <div className="progress-bar">
                      <motion.div
                        className="progress-bar-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${utilization}%` }}
                        transition={{ duration: 0.8, delay: i * 0.05, ease: "easeOut" }}
                        style={{ background: `linear-gradient(90deg, ${color}, ${color}cc)` }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
