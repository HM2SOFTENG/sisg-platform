"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  Plus,
  Building2,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  Calendar,
  Mail,
  User,
} from "lucide-react";

interface Partner {
  id: string;
  companyName: string;
  type: "technology" | "security" | "consulting";
  status: "active" | "pending" | "expired";
  annualValue: number;
  contactName: string;
  contactEmail: string;
  description: string;
  renewalDate: string;
}

interface KPI {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

export default function PartnershipAdmin() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    type: "technology" as const,
    status: "pending" as const,
    annualValue: "",
    contactName: "",
    contactEmail: "",
    description: "",
    renewalDate: "",
  });

  useEffect(() => {
    fetchPartnerships();
  }, []);

  const fetchPartnerships = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("sisg_admin_token");
      const response = await fetch("/api/admin/partnerships", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPartners(data);
        calculateKPIs(data);
      }
    } catch (error) {
      console.error("Error fetching partnerships:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateKPIs = (partnerList: Partner[]) => {
    const activePartners = partnerList.filter(
      (p) => p.status === "active"
    ).length;
    const totalValue = partnerList.reduce((sum, p) => sum + p.annualValue, 0);
    const pendingPartners = partnerList.filter(
      (p) => p.status === "pending"
    ).length;

    setKpis([
      {
        label: "Total Partners",
        value: partnerList.length,
        icon: <Building2 className="w-5 h-5" />,
        color: "from-blue-500 to-cyan-500",
      },
      {
        label: "Active",
        value: activePartners,
        icon: <TrendingUp className="w-5 h-5" />,
        color: "from-emerald-500 to-cyan-500",
      },
      {
        label: "Partnership Value",
        value: `$${(totalValue / 1000000).toFixed(1)}M`,
        icon: <AlertCircle className="w-5 h-5" />,
        color: "from-orange-500 to-red-500",
      },
      {
        label: "Pending",
        value: pendingPartners,
        icon: <TrendingUp className="w-5 h-5" />,
        color: "from-purple-500 to-emerald-500",
      },
    ]);
  };

  const handleAddPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("sisg_admin_token");
      const response = await fetch("/api/admin/partnerships", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          annualValue: parseFloat(formData.annualValue),
        }),
      });

      if (response.ok) {
        fetchPartnerships();
        setShowModal(false);
        setFormData({
          companyName: "",
          type: "technology",
          status: "pending",
          annualValue: "",
          contactName: "",
          contactEmail: "",
          description: "",
          renewalDate: "",
        });
      }
    } catch (error) {
      console.error("Error creating partnership:", error);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "technology":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "security":
        return "bg-red-500/10 text-red-400 border-red-500/30";
      case "consulting":
        return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      default:
        return "bg-gray-500/10 text-gray-400";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "pending":
        return "bg-orange-500/10 text-orange-400 border-orange-500/30";
      case "expired":
        return "bg-red-500/10 text-red-400 border-red-500/30";
      default:
        return "bg-gray-500/10 text-gray-400";
    }
  };

  const isDueForRenewal = (renewalDate: string) => {
    const today = new Date();
    const renewal = new Date(renewalDate);
    const daysUntilRenewal = Math.floor(
      (renewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilRenewal >= 0 && daysUntilRenewal <= 90;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center"
        >
          <div>
            <h1
              className="text-3xl font-bold text-white"
              style={{ fontFamily: "Sora, sans-serif" }}
            >
              Partnership Management
            </h1>
            <p className="text-gray-400 mt-2">Manage and track partnerships</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg text-white font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition"
          >
            <Plus className="w-5 h-5" />
            Add Partner
          </motion.button>
        </motion.div>

        {/* KPI Cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          {kpis.map((kpi, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="tech-card p-5 border border-gray-700"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                    {kpi.label}
                  </p>
                  <p className="text-2xl font-bold text-white mt-2">{kpi.value}</p>
                </div>
                <div className={`bg-gradient-to-br ${kpi.color} p-3 rounded-lg text-white`}>
                  {kpi.icon}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Partners Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          {loading ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-400">Loading partnerships...</p>
            </div>
          ) : partners.length > 0 ? (
            partners.map((partner, index) => (
              <motion.div
                key={partner.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="tech-card p-5 border border-gray-700 hover:border-blue-500/50 transition cursor-pointer group relative"
              >
                {/* Renewal Warning */}
                {isDueForRenewal(partner.renewalDate) && (
                  <div className="absolute top-3 right-3">
                    <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 rounded border border-amber-500/40">
                      <AlertCircle className="w-3 h-3 text-amber-400" />
                      <span className="text-[10px] text-amber-400">Renewal Due</span>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between pr-32">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white">
                        {partner.companyName}
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">
                        {partner.description}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-blue-400 transition" />
                  </div>

                  {/* Badges */}
                  <div className="flex gap-2">
                    <span className={`text-xs px-2 py-1 rounded border ${getTypeColor(partner.type)}`}>
                      {partner.type}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(partner.status)}`}>
                      {partner.status}
                    </span>
                  </div>

                  {/* Value Section */}
                  <div className="space-y-1 pt-2 border-t border-gray-700">
                    <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                      Annual Value
                    </p>
                    <p className="text-2xl font-bold text-emerald-400">
                      ${(partner.annualValue / 1000000).toFixed(2)}M
                    </p>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-2 pt-2 border-t border-gray-700">
                    <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-2">
                      Contact
                    </p>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-300">
                        {partner.contactName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <a
                        href={`mailto:${partner.contactEmail}`}
                        className="text-sm text-blue-400 hover:underline"
                      >
                        {partner.contactEmail}
                      </a>
                    </div>
                  </div>

                  {/* Renewal Date */}
                  <div className="flex items-center gap-2 text-sm text-gray-400 pt-2 border-t border-gray-700">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span>
                      Renewal:{" "}
                      <span className="text-white font-semibold">
                        {new Date(partner.renewalDate).toLocaleDateString()}
                      </span>
                    </span>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-400">No partnerships found</p>
            </div>
          )}
        </motion.div>

        {/* Add Partner Modal */}
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="tech-card p-6 border border-gray-700 w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
              <h2
                className="text-xl font-bold text-white mb-4"
                style={{ fontFamily: "Sora, sans-serif" }}
              >
                Add New Partner
              </h2>
              <form onSubmit={handleAddPartner} className="space-y-4">
                <div>
                  <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) =>
                      setFormData({ ...formData, companyName: e.target.value })
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
                    rows={2}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                      Type
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({ ...formData, type: e.target.value as any })
                      }
                      className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="technology">Technology</option>
                      <option value="security">Security</option>
                      <option value="consulting">Consulting</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value as any })
                      }
                      className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="active">Active</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                    Annual Value ($)
                  </label>
                  <input
                    type="number"
                    value={formData.annualValue}
                    onChange={(e) =>
                      setFormData({ ...formData, annualValue: e.target.value })
                    }
                    className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    value={formData.contactName}
                    onChange={(e) =>
                      setFormData({ ...formData, contactName: e.target.value })
                    }
                    className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, contactEmail: e.target.value })
                    }
                    className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                    Renewal Date
                  </label>
                  <input
                    type="date"
                    value={formData.renewalDate}
                    onChange={(e) =>
                      setFormData({ ...formData, renewalDate: e.target.value })
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
