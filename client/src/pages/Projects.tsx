import { useMemo, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Calendar, DollarSign, FolderKanban, Search, Users, X } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "sonner";

interface Project {
  id: string | number;
  name: string;
  title?: string;
  client?: string;
  status?: string;
  priority?: string;
  budget?: string | number;
  team?: number;
  due?: string;
  progress?: number;
  color?: string;
  description?: string;
  summary?: string;
  capabilities?: string[];
}

const statusColors: Record<string, string> = {
  "In Progress": "#0066ff",
  Planning: "#ffb800",
  Completed: "#00e5a0",
  Active: "#00d4ff",
};

const priorityColors: Record<string, string> = {
  Critical: "#ff3b3b",
  High: "#ffb800",
  Medium: "#0066ff",
  Low: "#6b7280",
};

const DEFAULT_COLOR = "#0066ff";

function formatBudget(value?: string | number): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
  const numeric = Number(String(value).replace(/[^\d.-]/g, ""));
  if (!Number.isNaN(numeric) && numeric > 0) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(numeric);
  }
  return value;
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    void fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/public/projects");
      if (!response.ok) throw new Error("Request failed");
      const data = await response.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const statuses = useMemo(
    () => ["All", ...Array.from(new Set(projects.map((project) => project.status).filter(Boolean) as string[]))],
    [projects],
  );

  const filtered = useMemo(
    () => projects.filter((project) => {
      const q = search.trim().toLowerCase();
      const matchSearch = !q
        || project.name?.toLowerCase().includes(q)
        || project.client?.toLowerCase().includes(q)
        || project.summary?.toLowerCase().includes(q)
        || project.description?.toLowerCase().includes(q);
      const matchStatus = statusFilter === "All" || project.status === statusFilter;
      return matchSearch && matchStatus;
    }),
    [projects, search, statusFilter],
  );

  const stats = useMemo(() => {
    const activeCount = projects.filter((project) => ["Active", "In Progress"].includes(project.status || "")).length;
    const completedCount = projects.filter((project) => project.status === "Completed").length;
    const avgProgress = projects.length > 0
      ? Math.round(projects.reduce((sum, project) => sum + (project.progress ?? 0), 0) / projects.length)
      : 0;
    const uniqueClients = new Set(projects.map((project) => project.client).filter(Boolean)).size;

    return [
      { label: "Active", value: activeCount, color: "#00d4ff" },
      { label: "Completed", value: completedCount, color: "#00e5a0" },
      { label: "Avg Progress", value: `${avgProgress}%`, color: "#0066ff" },
      { label: "Clients", value: uniqueClients, color: "#ffb800" },
    ];
  }, [projects]);

  return (
    <DashboardLayout title="Projects">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-1">Project Delivery</div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
            Mission <span className="gradient-text">Projects</span>
          </h1>
        </div>
        <button
          onClick={() => { window.location.href = "/contact"; }}
          className="btn-tech text-xs py-2 px-4 self-start sm:self-auto"
        >
          <ArrowUpRight className="w-3.5 h-3.5" /> Start a Project
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
            placeholder="Search projects..."
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {statuses.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className="text-xs font-mono px-3 py-2 border transition-all"
              style={statusFilter === status
                ? { borderColor: "#0066ff", background: "#0066ff15", color: "#00d4ff" }
                : { borderColor: "rgba(255,255,255,0.08)", color: "rgba(107,114,128,1)" }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-48 text-gray-500 font-mono text-xs">
          Loading projects...
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 text-gray-600 font-mono text-xs gap-2">
          <FolderKanban className="w-8 h-8 opacity-30" />
          <span>{projects.length === 0 ? "No projects published yet." : "No projects match your filter."}</span>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filtered.map((project, index) => {
            const color = project.color || DEFAULT_COLOR;
            const progress = project.progress ?? 0;
            const budget = formatBudget(project.budget);
            return (
              <motion.button
                key={project.id}
                type="button"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06, duration: 0.4 }}
                onClick={() => setSelectedProject(project)}
                className="text-left"
              >
                <div className="tech-card p-5 h-full hover:border-white/15 transition-colors">
                  <div className="h-[2px] mb-4 -mx-5 -mt-5" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-bold text-sm leading-snug mb-1 truncate" style={{ fontFamily: "Sora, sans-serif" }}>{project.name}</h3>
                      {project.client && <div className="text-gray-500 text-xs font-mono">{project.client}</div>}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {project.priority && (
                        <span className="text-[10px] font-mono px-2 py-0.5 border" style={{ color: priorityColors[project.priority] || "#6b7280", borderColor: `${priorityColors[project.priority] || "#6b7280"}30`, background: `${priorityColors[project.priority] || "#6b7280"}08` }}>
                          {project.priority}
                        </span>
                      )}
                      {project.status && (
                        <span className="text-[10px] font-mono px-2 py-0.5 border" style={{ color: statusColors[project.status] || "#6b7280", borderColor: `${statusColors[project.status] || "#6b7280"}30`, background: `${statusColors[project.status] || "#6b7280"}08` }}>
                          {project.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {(project.summary || project.description) && (
                    <p className="text-sm text-gray-400 leading-relaxed mb-4 line-clamp-3">
                      {project.summary || project.description}
                    </p>
                  )}

                  <div className="mb-4">
                    <div className="flex justify-between mb-1.5">
                      <span className="text-gray-600 text-[10px] font-mono">Progress</span>
                      <span className="text-xs font-mono font-bold" style={{ color }}>{progress}%</span>
                    </div>
                    <div className="progress-bar">
                      <motion.div
                        className="progress-bar-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 1, delay: index * 0.1, ease: "easeOut" }}
                        style={{ background: `linear-gradient(90deg, ${color}, ${color}cc)` }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-gray-500">
                    {budget && <span className="flex items-center gap-1.5"><DollarSign className="w-3 h-3" />{budget}</span>}
                    {project.team != null && <span className="flex items-center gap-1.5"><Users className="w-3 h-3" />{project.team} FTE</span>}
                    {project.due && <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" />{project.due}</span>}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {selectedProject && (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 bg-black/70 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProject(null)}
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
                  <div className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-2">Project Detail</div>
                  <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>{selectedProject.name}</h2>
                  {selectedProject.client && <p className="text-gray-400 mt-2">{selectedProject.client}</p>}
                </div>
                <button type="button" onClick={() => setSelectedProject(null)} className="p-2 text-gray-500 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {selectedProject.status && <div className="tech-card p-4"><div className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Status</div><div className="text-white mt-2">{selectedProject.status}</div></div>}
                {formatBudget(selectedProject.budget) && <div className="tech-card p-4"><div className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Budget</div><div className="text-white mt-2">{formatBudget(selectedProject.budget)}</div></div>}
                {selectedProject.team != null && <div className="tech-card p-4"><div className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Team</div><div className="text-white mt-2">{selectedProject.team} FTE</div></div>}
                {selectedProject.due && <div className="tech-card p-4"><div className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Timeline</div><div className="text-white mt-2">{selectedProject.due}</div></div>}
              </div>

              {(selectedProject.description || selectedProject.summary) && (
                <div className="tech-card p-5 mb-6">
                  <div className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-3">Overview</div>
                  <p className="text-sm text-gray-300 leading-relaxed">{selectedProject.description || selectedProject.summary}</p>
                </div>
              )}

              {selectedProject.capabilities && selectedProject.capabilities.length > 0 && (
                <div className="tech-card p-5 mb-6">
                  <div className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-3">Capabilities</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedProject.capabilities.map((capability) => (
                      <span key={capability} className="text-xs font-mono px-2.5 py-1 border border-[#0066ff]/25 text-[#7cc6ff] bg-[#0066ff]/10">
                        {capability}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={() => { window.location.href = "/contact"; }} className="btn-tech text-xs py-2.5 px-5">
                <ArrowUpRight className="w-3.5 h-3.5" /> Discuss Similar Work
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
