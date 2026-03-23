"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Plus,
  Folder,
  TrendingUp,
  AlertCircle,
  Calendar,
  User,
  ChevronRight,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string;
  status: "planning" | "active" | "review" | "completed";
  priority: "high" | "medium" | "low";
  budget: number;
  spent: number;
  progress: number;
  lead: string;
  deadline: string;
}

interface KPI {
  label: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  color: string;
}

export default function ProjectManagement() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "planning" as const,
    priority: "medium" as const,
    budget: "",
    lead: "",
    deadline: "",
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("sisg_admin_token");
      const response = await fetch("/api/admin/projects", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProjects(data);
        calculateKPIs(data);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateKPIs = (projectList: Project[]) => {
    const activeProjects = projectList.filter(
      (p) => p.status === "active"
    ).length;
    const totalBudget = projectList.reduce((sum, p) => sum + p.budget, 0);
    const totalSpent = projectList.reduce((sum, p) => sum + p.spent, 0);
    const avgProgress =
      projectList.length > 0
        ? Math.round(
            projectList.reduce((sum, p) => sum + p.progress, 0) /
              projectList.length
          )
        : 0;

    setKpis([
      {
        label: "Active Projects",
        value: activeProjects,
        icon: <Folder className="w-5 h-5" />,
        color: "from-cyan-500 to-blue-500",
      },
      {
        label: "Total Budget",
        value: `$${(totalBudget / 1000000).toFixed(1)}M`,
        icon: <TrendingUp className="w-5 h-5" />,
        color: "from-emerald-500 to-cyan-500",
      },
      {
        label: "Total Spent",
        value: `$${(totalSpent / 1000000).toFixed(1)}M`,
        icon: <AlertCircle className="w-5 h-5" />,
        color: "from-orange-500 to-red-500",
      },
      {
        label: "Avg Progress",
        value: avgProgress,
        unit: "%",
        icon: <TrendingUp className="w-5 h-5" />,
        color: "from-emerald-500 to-green-500",
      },
    ]);
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("sisg_admin_token");
      const response = await fetch("/api/admin/projects", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          budget: parseFloat(formData.budget),
        }),
      });

      if (response.ok) {
        toast.success("Project created successfully");
        fetchProjects();
        setShowModal(false);
        setFormData({
          name: "",
          description: "",
          status: "planning",
          priority: "medium",
          budget: "",
          lead: "",
          deadline: "",
        });
      } else {
        toast.error("Failed to create project");
      }
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("Failed to create project");
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500/10 text-red-400 border-red-500/30";
      case "medium":
        return "bg-orange-500/10 text-orange-400 border-orange-500/30";
      case "low":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      default:
        return "bg-gray-500/10 text-gray-400";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "planning":
        return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      case "active":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "review":
        return "bg-orange-500/10 text-orange-400 border-orange-500/30";
      case "completed":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      default:
        return "bg-gray-500/10 text-gray-400";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
        >
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
              Project Management
            </h1>
            <p className="text-gray-400 mt-2">Manage and track all projects</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowModal(true)}
            className="w-full sm:w-auto flex items-center justify-center sm:justify-start gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg text-white font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition"
          >
            <Plus className="w-5 h-5" />
            Add Project
          </motion.button>
        </motion.div>

        {/* KPI Cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
        >
          {kpis.map((kpi, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="tech-card p-3 sm:p-5 border border-gray-700"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <p className="text-[8px] sm:text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                    {kpi.label}
                  </p>
                  <p className="text-lg sm:text-2xl font-bold text-white mt-2">
                    {kpi.value}
                    {kpi.unit && <span className="text-xs sm:text-sm text-gray-400">{kpi.unit}</span>}
                  </p>
                </div>
                <div className={`bg-gradient-to-br ${kpi.color} p-2 sm:p-3 rounded-lg text-white flex-shrink-0`}>
                  {kpi.icon}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Projects Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          {loading ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-400">Loading projects...</p>
            </div>
          ) : projects.length > 0 ? (
            projects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="tech-card p-5 border border-gray-700 hover:border-blue-500/50 transition cursor-pointer group"
              >
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white">
                        {project.name}
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">
                        {project.description}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-blue-400 transition" />
                  </div>

                  {/* Badges */}
                  <div className="flex gap-2">
                    <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded border ${getPriorityColor(project.priority)}`}>
                      {project.priority} priority
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                        Progress
                      </p>
                      <p className="text-sm font-semibold text-cyan-400">
                        {project.progress}%
                      </p>
                    </div>
                    <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${project.progress}%` }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                      />
                    </div>
                  </div>

                  {/* Budget */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                        Budget Utilization
                      </p>
                      <p className="text-sm font-semibold text-emerald-400">
                        {((project.spent / project.budget) * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(project.spent / project.budget) * 100}%` }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      ${(project.spent / 1000).toFixed(1)}k of $
                      {(project.budget / 1000).toFixed(1)}k
                    </p>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 pt-2 border-t border-gray-700">
                    <div className="flex items-center gap-2 min-w-0">
                      <User className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
                      <span className="text-[10px] sm:text-xs text-gray-400 truncate">{project.lead}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
                      <span className="text-[10px] sm:text-xs text-gray-400">
                        {new Date(project.deadline).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-400">No projects found</p>
            </div>
          )}
        </motion.div>

        {/* Add Project Modal */}
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="tech-card p-4 sm:p-6 border border-gray-700 w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-lg sm:text-xl font-bold text-white mb-4" style={{ fontFamily: "Sora, sans-serif" }}>
                Add New Project
              </h2>
              <form onSubmit={handleAddProject} className="space-y-4">
                <div>
                  <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-blue-500"
                    rows={3}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          status: e.target.value as any,
                        })
                      }
                      className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="planning">Planning</option>
                      <option value="active">Active</option>
                      <option value="review">Review</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          priority: e.target.value as any,
                        })
                      }
                      className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                      Budget ($)
                    </label>
                    <input
                      type="number"
                      value={formData.budget}
                      onChange={(e) =>
                        setFormData({ ...formData, budget: e.target.value })
                      }
                      className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                      Lead
                    </label>
                    <input
                      type="text"
                      value={formData.lead}
                      onChange={(e) =>
                        setFormData({ ...formData, lead: e.target.value })
                      }
                      className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                    Deadline
                  </label>
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) =>
                      setFormData({ ...formData, deadline: e.target.value })
                    }
                    className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-700 rounded text-gray-300 hover:bg-gray-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 rounded text-white font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition"
                  >
                    Create
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
