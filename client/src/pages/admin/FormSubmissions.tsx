"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { Search, Trash2, CheckCircle, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface Submission {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: "new" | "reviewed" | "responded";
  date: string;
}

export default function FormSubmissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "new" | "reviewed" | "responded">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const token = localStorage.getItem("sisg_admin_token");
      const response = await fetch("/api/admin/submissions", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        const data = await response.json();
        setSubmissions(data);
      }
    } catch (error) {
      console.error("Failed to fetch submissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: "new" | "reviewed" | "responded") => {
    try {
      const token = localStorage.getItem("sisg_admin_token");
      const response = await fetch(`/api/admin/submissions/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        setSubmissions((prev) =>
          prev.map((sub) => (sub.id === id ? { ...sub, status: newStatus } : sub))
        );
        toast.success(`Submission marked as ${newStatus}`);
      } else {
        toast.error("Failed to update submission");
      }
    } catch (error) {
      console.error("Failed to update submission:", error);
      toast.error("Failed to update submission");
    }
  };

  const deleteSubmission = async (id: string) => {
    try {
      const token = localStorage.getItem("sisg_admin_token");
      const response = await fetch(`/api/admin/submissions/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        setSubmissions((prev) => prev.filter((sub) => sub.id !== id));
        toast.success("Submission deleted successfully");
      } else {
        toast.error("Failed to delete submission");
      }
    } catch (error) {
      console.error("Failed to delete submission:", error);
      toast.error("Failed to delete submission");
    }
  };

  const filteredSubmissions = submissions.filter((sub) => {
    const matchesSearch =
      sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: submissions.length,
    new: submissions.filter((s) => s.status === "new").length,
    reviewed: submissions.filter((s) => s.status === "reviewed").length,
    responded: submissions.filter((s) => s.status === "responded").length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "border-[#0066ff] text-[#0066ff]";
      case "reviewed":
        return "border-[#ffb800] text-[#ffb800]";
      case "responded":
        return "border-[#00e5a0] text-[#00e5a0]";
      default:
        return "border-gray-600 text-gray-400";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-xl sm:text-3xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
            Contact Form <span className="gradient-text">Submissions</span>
          </h1>
          <p className="text-gray-400 mt-2">Manage and respond to contact form submissions</p>
        </motion.div>

        {/* KPI Cards */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4"
        >
          <div className="tech-card p-5">
            <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Total Submissions</p>
            <p className="text-2xl font-bold text-white mt-3">{stats.total}</p>
          </div>
          <div className="tech-card p-5">
            <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">New</p>
            <p className="text-2xl font-bold" style={{ color: "#0066ff" }}>
              {stats.new}
            </p>
          </div>
          <div className="tech-card p-5">
            <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Reviewed</p>
            <p className="text-2xl font-bold" style={{ color: "#ffb800" }}>
              {stats.reviewed}
            </p>
          </div>
          <div className="tech-card p-5">
            <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Responded</p>
            <p className="text-2xl font-bold" style={{ color: "#00e5a0" }}>
              {stats.responded}
            </p>
          </div>
        </motion.div>

        {/* Search and Filter */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="tech-card p-5 space-y-4"
        >
          <div className="flex items-center gap-3 bg-white/5 rounded px-4 py-3">
            <Search size={18} className="text-gray-500" />
            <input
              type="text"
              placeholder="Search submissions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {(["all", "new", "reviewed", "responded"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 text-sm font-mono uppercase tracking-widest transition-colors ${
                  statusFilter === status
                    ? "bg-[#0066ff] text-white"
                    : "bg-white/5 text-gray-400 hover:text-white"
                }`}
              >
                {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Submissions Table */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="tech-card p-5"
        >
          {loading ? (
            <p className="text-gray-400 text-center py-8">Loading submissions...</p>
          ) : filteredSubmissions.length === 0 ? (
            <>
              {submissions.length > 0 && toast.info("No submissions match your filters")}
              <p className="text-gray-400 text-center py-8">No submissions found</p>
            </>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                      Name
                    </th>
                    <th className="text-left py-3 px-4 text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                      Email
                    </th>
                    <th className="text-left py-3 px-4 text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                      Subject
                    </th>
                    <th className="text-left py-3 px-4 text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubmissions.map((submission) => (
                    <React.Fragment key={submission.id}>
                      <tr
                        className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                        onClick={() =>
                          setExpandedId(expandedId === submission.id ? null : submission.id)
                        }
                      >
                        <td className="py-4 px-4 text-white">{submission.name}</td>
                        <td className="py-4 px-4 text-gray-400 text-xs">{submission.email}</td>
                        <td className="py-4 px-4 text-gray-300">{submission.subject}</td>
                        <td className="py-4 px-4">
                          <span
                            className={`text-[10px] font-mono px-2 py-1 border ${getStatusColor(
                              submission.status
                            )}`}
                          >
                            {submission.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-gray-400 text-xs">
                          {new Date(submission.date).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedId(expandedId === submission.id ? null : submission.id);
                            }}
                            className="text-[#0066ff] hover:text-[#00d4ff] transition-colors"
                          >
                            <MessageSquare size={16} />
                          </button>
                        </td>
                      </tr>
                      {expandedId === submission.id && (
                        <tr className="bg-white/5">
                          <td colSpan={6} className="py-4 px-4">
                            <div className="space-y-4">
                              <div>
                                <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-2">
                                  Message
                                </p>
                                <p className="text-gray-300 leading-relaxed">{submission.message}</p>
                              </div>
                              <div className="flex items-center gap-4">
                                <div>
                                  <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-1">
                                    Phone
                                  </p>
                                  <p className="text-gray-300">{submission.phone}</p>
                                </div>
                              </div>
                              <div className="flex gap-2 mt-4">
                                {submission.status !== "reviewed" && (
                                  <button
                                    onClick={() => updateStatus(submission.id, "reviewed")}
                                    className="px-3 py-2 text-xs font-mono bg-[#ffb800]/20 text-[#ffb800] hover:bg-[#ffb800]/30 transition-colors"
                                  >
                                    Mark Reviewed
                                  </button>
                                )}
                                {submission.status !== "responded" && (
                                  <button
                                    onClick={() => updateStatus(submission.id, "responded")}
                                    className="px-3 py-2 text-xs font-mono bg-[#00e5a0]/20 text-[#00e5a0] hover:bg-[#00e5a0]/30 transition-colors flex items-center gap-2"
                                  >
                                    <CheckCircle size={14} /> Mark Responded
                                  </button>
                                )}
                                <button
                                  onClick={() => deleteSubmission(submission.id)}
                                  className="px-3 py-2 text-xs font-mono bg-[#ff3b3b]/20 text-[#ff3b3b] hover:bg-[#ff3b3b]/30 transition-colors flex items-center gap-2 ml-auto"
                                >
                                  <Trash2 size={14} /> Delete
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
