/* Projects Page — Sentinel Sharp v2 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FolderKanban, Plus, Search, Filter, Calendar, Users, DollarSign, ArrowRight } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "sonner";

interface Project {
  id: number;
  name: string;
  client: string;
  status: string;
  priority: string;
  budget: string;
  team: number;
  due: string;
  progress: number;
  color: string;
}

const statusColors: Record<string, string> = {
  "In Progress": "#0066ff",
  "Planning": "#ffb800",
  "Completed": "#00e5a0",
  "Active": "#00d4ff",
};

const priorityColors: Record<string, string> = {
  "Critical": "#ff3b3b",
  "High": "#ffb800",
  "Medium": "#0066ff",
  "Low": "#6b7280",
};

const projectColors = ["#0066ff", "#8b5cf6", "#00d4ff", "#00e5a0", "#ff3b3b", "#ffb800"];

export default function Projects() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const statuses = ["All", "In Progress", "Planning", "Completed", "Active"];

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem("sisg_admin_token");
      const response = await fetch("/api/admin/projects", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const mapped = data.map((p: any, i: number) => ({
          id: p.id || i + 1,
          name: p.name || p.title || "Untitled Project",
          client: p.client || p.agency || "",
          status: p.status || "In Progress",
          priority: p.priority || "Medium",
          budget: p.budget || (p.value ? (p.value >= 1000000 ? `$${(p.value / 1000000).toFixed(1)}M` : `$${(p.value / 1000).toFixed(0)}K`) : "$0"),
          team: p.team || p.teamSize || 0,
          due: p.due || p.dueDate || "TBD",
          progress: p.progress || 0,
          color: projectColors[i % projectColors.length],
        }));
        setProjects(mapped);
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = projects.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.client.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <DashboardLayout title="Projects">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-1">Project Management</div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
            Active <span className="gradient-text">Projects</span>
          </h1>
        </div>
        <button onClick={() => toast.info("Feature coming soon")} className="btn-tech text-xs py-2 px-4 self-start sm:self-auto">
          <Plus className="w-3.5 h-3.5" /> New Project
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3 sm:w-3.5 h-3 sm:h-3.5 text-gray-600" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[oklch(0.085_0.025_255)] border border-white/8 text-gray-300 text-xs pl-8 sm:pl-9 pr-2.5 sm:pr-3 py-2 sm:py-2.5 focus:outline-none focus:border-[#0066ff]/30 font-mono placeholder:text-gray-700"
            placeholder="Search projects..."
          />
        </div>
        <div className="flex gap-1.5 sm:gap-2 flex-wrap">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="text-[11px] sm:text-xs font-mono px-2.5 sm:px-3 py-1.5 sm:py-2 border transition-all whitespace-nowrap"
              style={
                statusFilter === s
                  ? { borderColor: "#0066ff", background: "#0066ff15", color: "#00d4ff" }
                  : { borderColor: "rgba(255,255,255,0.08)", color: "rgba(107,114,128,1)" }
              }
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Project Cards */}
      {loading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="tech-card p-5 animate-pulse">
              <div className="h-[2px] mb-4 -mx-5 -mt-5 bg-white/5" />
              <div className="space-y-3">
                <div className="h-4 bg-white/8 rounded w-3/4" />
                <div className="h-3 bg-white/5 rounded w-1/2" />
                <div className="h-2 bg-white/5 rounded w-full mt-4" />
              </div>
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="tech-card p-10 text-center">
          <FolderKanban className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 mb-1">No projects found</p>
          <p className="text-gray-500 text-sm">Create a project to get started with project tracking</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {filtered.map((project, i) => (
          <motion.div key={project.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.4 }}>
            <div className="tech-card p-5 h-full">
              <div className="h-[2px] mb-4 -mx-5 -mt-5" style={{ background: `linear-gradient(90deg, ${project.color}, transparent)` }} />
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold text-sm leading-snug mb-1 truncate" style={{ fontFamily: "Sora, sans-serif" }}>{project.name}</h3>
                  <div className="text-gray-500 text-xs font-mono">{project.client}</div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <span className="text-[10px] font-mono px-2 py-0.5 border" style={{ color: priorityColors[project.priority], borderColor: priorityColors[project.priority] + "30", background: priorityColors[project.priority] + "08" }}>
                    {project.priority}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 border" style={{ color: statusColors[project.status], borderColor: statusColors[project.status] + "30", background: statusColors[project.status] + "08" }}>
                    {project.status}
                  </span>
                </div>
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex justify-between mb-1.5">
                  <span className="text-gray-600 text-[10px] font-mono">Progress</span>
                  <span className="text-xs font-mono font-bold" style={{ color: project.color }}>{project.progress}%</span>
                </div>
                <div className="progress-bar">
                  <motion.div
                    className="progress-bar-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${project.progress}%` }}
                    transition={{ duration: 1, delay: i * 0.1, ease: "easeOut" }}
                    style={{ background: `linear-gradient(90deg, ${project.color}, ${project.color}cc)` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono text-gray-500">
                <span className="flex items-center gap-1.5"><DollarSign className="w-3 h-3" />{project.budget}</span>
                <span className="flex items-center gap-1.5"><Users className="w-3 h-3" />{project.team} FTE</span>
                <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" />{project.due}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      )}
    </DashboardLayout>
  );
}
