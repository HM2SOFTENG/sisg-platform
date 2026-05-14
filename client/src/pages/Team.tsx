import { useMemo, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Search, Shield, Users, X } from "lucide-react";
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
  bio?: string;
  certifications?: string[];
}

const DEFAULT_COLOR = "#0066ff";

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}

export default function Team() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("All");
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  useEffect(() => {
    void fetchTeam();
  }, []);

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/public/team");
      if (!response.ok) throw new Error("Request failed");
      const data = await response.json();
      setMembers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching team:", error);
      toast.error("Failed to load team");
    } finally {
      setLoading(false);
    }
  };

  const departments = useMemo(
    () => ["All", ...Array.from(new Set(members.map((member) => member.dept).filter(Boolean) as string[]))],
    [members],
  );

  const filtered = useMemo(
    () => members.filter((member) => {
      const q = search.trim().toLowerCase();
      const matchSearch = !q
        || member.name?.toLowerCase().includes(q)
        || member.role?.toLowerCase().includes(q)
        || member.bio?.toLowerCase().includes(q)
        || member.certifications?.some((certification) => certification.toLowerCase().includes(q));
      const matchDept = dept === "All" || member.dept === dept;
      return matchSearch && matchDept;
    }),
    [members, search, dept],
  );

  const stats = useMemo(() => {
    const clearances = members.filter((member) => member.clearance).length;
    const avgUtilization = members.length > 0
      ? Math.round(members.reduce((sum, member) => sum + (member.utilization ?? 0), 0) / members.length)
      : 0;

    return [
      { label: "Team Members", value: members.length, color: "#ffffff" },
      { label: "Departments", value: Math.max(departments.length - 1, 0), color: "#0066ff" },
      { label: "Clearances", value: clearances, color: "#8b5cf6" },
      { label: "Avg Utilization", value: `${avgUtilization}%`, color: "#00e5a0" },
    ];
  }, [departments.length, members]);

  return (
    <DashboardLayout title="Team">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-1">People + Expertise</div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
            Team <span className="gradient-text">Directory</span>
          </h1>
        </div>
        <button
          onClick={() => { window.location.href = "/services"; }}
          className="btn-tech text-xs py-2 px-4 self-start sm:self-auto"
        >
          <ArrowUpRight className="w-3.5 h-3.5" /> View Capabilities
        </button>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
        {stats.map((stat) => (
          <div key={stat.label} className="tech-card p-4">
            <div className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">{stat.label}</div>
            <div className="text-xl font-bold mt-2" style={{ color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

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
          {departments.map((department) => (
            <button
              key={department}
              onClick={() => setDept(department)}
              className="text-xs font-mono px-3 py-2 border transition-all"
              style={dept === department
                ? { borderColor: "#0066ff", background: "#0066ff15", color: "#00d4ff" }
                : { borderColor: "rgba(255,255,255,0.08)", color: "rgba(107,114,128,1)" }}
            >
              {department}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-48 text-gray-500 font-mono text-xs">
          Loading team...
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 text-gray-600 font-mono text-xs gap-2">
          <Users className="w-8 h-8 opacity-30" />
          <span>{members.length === 0 ? "No team members published yet." : "No members match your filter."}</span>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((member, index) => {
            const color = member.color || DEFAULT_COLOR;
            const initials = member.initials || getInitials(member.name);
            const utilization = member.utilization ?? 0;

            return (
              <motion.button
                key={member.id}
                type="button"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06, duration: 0.4 }}
                onClick={() => setSelectedMember(member)}
                className="text-left"
              >
                <div className="tech-card p-5 h-full hover:border-white/15 transition-colors">
                  <div className="h-[2px] mb-4 -mx-5 -mt-5" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
                  <div className="flex items-start gap-3 mb-4">
                    <div
                      className="w-10 h-10 flex items-center justify-center font-bold text-sm flex-shrink-0"
                      style={{ background: `${color}20`, border: `1px solid ${color}40`, color, fontFamily: "Sora, sans-serif" }}
                    >
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-bold text-sm leading-snug truncate" style={{ fontFamily: "Sora, sans-serif" }}>{member.name}</div>
                      {member.role && <div className="text-gray-500 text-xs font-mono truncate">{member.role}</div>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-3 gap-3">
                    {member.dept && (
                      <span className="text-[10px] font-mono px-2 py-0.5 border" style={{ color: "#0066ff", borderColor: "#0066ff30", background: "#0066ff08" }}>
                        {member.dept}
                      </span>
                    )}
                    {member.clearance && (
                      <div className="flex items-center gap-1 min-w-0">
                        <Shield className="w-3 h-3 text-gray-600" />
                        <span className="text-gray-500 text-[10px] font-mono truncate">{member.clearance}</span>
                      </div>
                    )}
                  </div>

                  {member.bio && <p className="text-sm text-gray-400 leading-relaxed mb-4 line-clamp-3">{member.bio}</p>}

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
                        transition={{ duration: 0.8, delay: index * 0.05, ease: "easeOut" }}
                        style={{ background: `linear-gradient(90deg, ${color}, ${color}cc)` }}
                      />
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {selectedMember && (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 bg-black/70 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMember(null)}
            />
            <motion.div
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 32 }}
              transition={{ duration: 0.2 }}
              className="fixed right-0 top-0 h-full w-full max-w-xl bg-[oklch(0.09_0.02_255)] border-l border-white/10 z-50 p-6 overflow-y-auto"
            >
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <div className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-2">Team Profile</div>
                  <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>{selectedMember.name}</h2>
                  {selectedMember.role && <p className="text-gray-400 mt-2">{selectedMember.role}</p>}
                </div>
                <button type="button" onClick={() => setSelectedMember(null)} className="p-2 text-gray-500 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {selectedMember.dept && <div className="tech-card p-4"><div className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Department</div><div className="text-white mt-2">{selectedMember.dept}</div></div>}
                {selectedMember.clearance && <div className="tech-card p-4"><div className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Clearance</div><div className="text-white mt-2">{selectedMember.clearance}</div></div>}
                <div className="tech-card p-4"><div className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Utilization</div><div className="text-white mt-2">{selectedMember.utilization ?? 0}%</div></div>
                <div className="tech-card p-4"><div className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Initials</div><div className="text-white mt-2">{selectedMember.initials || getInitials(selectedMember.name)}</div></div>
              </div>

              {selectedMember.bio && (
                <div className="tech-card p-5 mb-6">
                  <div className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-3">Background</div>
                  <p className="text-sm text-gray-300 leading-relaxed">{selectedMember.bio}</p>
                </div>
              )}

              {selectedMember.certifications && selectedMember.certifications.length > 0 && (
                <div className="tech-card p-5 mb-6">
                  <div className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-3">Certifications + Skills</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedMember.certifications.map((certification) => (
                      <span key={certification} className="text-xs font-mono px-2.5 py-1 border border-[#8b5cf6]/30 text-[#c4b5fd] bg-[#8b5cf6]/10">
                        {certification}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={() => { window.location.href = "/contact"; }} className="btn-tech text-xs py-2.5 px-5">
                <ArrowUpRight className="w-3.5 h-3.5" /> Connect With SISG
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
