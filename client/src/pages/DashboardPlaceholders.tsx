/* Dashboard Placeholder Pages — Sentinel Sharp v2 */
import { motion } from "framer-motion";
import { CheckSquare, Calendar, Clock, BookOpen, FileText, Shield, Settings, Terminal } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "sonner";

function PlaceholderPage({ title, label, icon: Icon, color }: { title: string; label: string; icon: any; color: string }) {
  return (
    <DashboardLayout title={title}>
      <div className="mb-6">
        <div className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-1">{label}</div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
          {title} <span className="gradient-text">Module</span>
        </h1>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="tech-card p-12 text-center"
      >
        <div className="h-[2px] mb-8 -mx-12 -mt-12" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
        <div
          className="w-16 h-16 flex items-center justify-center mx-auto mb-5"
          style={{ background: color + "15", border: `1px solid ${color}30` }}
        >
          <Icon className="w-8 h-8" style={{ color }} />
        </div>
        <h2 className="text-xl font-bold text-white mb-3" style={{ fontFamily: "Sora, sans-serif" }}>{title}</h2>
        <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6 font-mono">
          This module is under active development. Full functionality will be available in the next release.
        </p>
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 animate-pulse" style={{ background: color }} />
          <span className="text-xs font-mono" style={{ color }}>Development in progress</span>
        </div>
        <button
          onClick={() => toast.info("Feature coming soon — check back in the next release.")}
          className="btn-tech text-xs py-2.5 px-6 mt-6"
          style={{ background: color }}
        >
          <Terminal className="w-3.5 h-3.5" /> Request Early Access
        </button>
      </motion.div>
    </DashboardLayout>
  );
}

export function Tasks() {
  return <PlaceholderPage title="Tasks" label="Task Management" icon={CheckSquare} color="#ff6b35" />;
}
export function CalendarPage() {
  return <PlaceholderPage title="Calendar" label="Scheduling" icon={Calendar} color="#0066ff" />;
}
export function TimeTracking() {
  return <PlaceholderPage title="Time Tracking" label="Timesheets" icon={Clock} color="#00d4ff" />;
}
export function KnowledgeBase() {
  return <PlaceholderPage title="Knowledge Base" label="Documentation" icon={BookOpen} color="#8b5cf6" />;
}
export function Reports() {
  return <PlaceholderPage title="Reports" label="Reporting" icon={FileText} color="#00e5a0" />;
}
export function Admin() {
  return <PlaceholderPage title="Admin" label="Administration" icon={Shield} color="#ff3b3b" />;
}
export function SettingsPage() {
  return <PlaceholderPage title="Settings" label="Configuration" icon={Settings} color="#6b7280" />;
}
